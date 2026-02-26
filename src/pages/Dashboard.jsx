import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import Onboarding from '../components/Onboarding';
import TransactionForm from '../components/TransactionForm';
import VincularPareja from '../components/VincularPareja';
import MetasAhorro from '../components/MetasAhorro';
import ModalUsd from '../components/ModalUsd';
import GraficoGastos from '../components/GraficoGastos';
import { Wallet, TrendingUp, TrendingDown, Calendar, Trash2, User, Users, Globe, Key, Edit, DollarSign, ArrowRightLeft, ChevronLeft, ChevronRight, LogOut, UserX } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [perfil, setPerfil] = useState(null);
  const [infoCompartido, setInfoCompartido] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [vistaActiva, setVistaActiva] = useState('personal'); 
  const [movimientos, setMovimientos] = useState([]);
  
  const [fechaFiltro, setFechaFiltro] = useState(() => {
    const hoy = new Date();
    return { mes: hoy.getMonth(), anio: hoy.getFullYear() };
  });

  const [resumen, setResumen] = useState({ saldoTotalArs: 0, ingresosMes: 0, egresosMes: 0 }); 
  const [usdPersonal, setUsdPersonal] = useState(0);
  const [usdCompartido, setUsdCompartido] = useState(0);
  const [triggerMetas, setTriggerMetas] = useState(0);
  const [mostrarModalUsd, setMostrarModalUsd] = useState(false);

  const formatearDinero = (monto) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(monto);

  const cargarDatosUsuario = async () => {
    try {
      const { data, error } = await supabase.from('perfiles').select('nombre, grupo_id, grupo_compartido_id').eq('id', user.id).single();
      if (error) throw error;
      
      setPerfil(data);
      if (data?.grupo_id) {
        cargarMovimientos(data.grupo_id, data.grupo_compartido_id);
        const { data: gPers } = await supabase.from('grupos').select('saldo_usd').eq('id', data.grupo_id).single();
        if (gPers) setUsdPersonal(gPers.saldo_usd || 0);
      }

      if (data?.grupo_compartido_id) {
        const { data: grupoData } = await supabase.from('grupos').select('nombre, codigo_invitacion, saldo_usd').eq('id', data.grupo_compartido_id).single();
        const { data: miembrosData } = await supabase.from('perfiles').select('nombre').eq('grupo_compartido_id', data.grupo_compartido_id);
        if (grupoData && miembrosData) {
          setUsdCompartido(grupoData.saldo_usd || 0);
          setInfoCompartido({ nombre: grupoData.nombre, codigo: grupoData.codigo_invitacion, integrantes: miembrosData.map(m => m.nombre).join(' y ') });
        }
      } else {
        setInfoCompartido(null);
        setUsdCompartido(0);
      }
    } catch (error) { console.error('Error:', error); } finally { setLoading(false); }
  };

const cargarMovimientos = useCallback(async (gPers, gComp) => {
    const grupos = [gPers]; if (gComp) grupos.push(gComp);
    
    // Le agregamos el 'error' para ver si Supabase se está quejando de algo
    const { data} = await supabase.from('transacciones')
      .select(`*, perfiles(nombre), categorias(nombre, tipo), metodos_pago(nombre)`)
      .in('grupo_id', grupos)
      .order('fecha', { ascending: false })
      .limit(1000);
    if (data) setMovimientos(data);
  }, []);

  useEffect(() => {
    const filtradosPorVista = movimientos.filter(mov => vistaActiva === 'total' ? true : mov.grupo_id === (vistaActiva === 'personal' ? perfil?.grupo_id : perfil?.grupo_compartido_id));
    
    const ingTotales = filtradosPorVista.filter(t => t.tipo === 'ingreso' && (!t.moneda || t.moneda === 'ARS')).reduce((a, c) => a + Number(c.monto), 0);
    const egrTotales = filtradosPorVista.filter(t => t.tipo === 'egreso' && (!t.moneda || t.moneda === 'ARS')).reduce((a, c) => a + Number(c.monto), 0);
    const saldoHistoricoArs = ingTotales - egrTotales;

    const filtradosDelMes = filtradosPorVista.filter(mov => {
      const fechaMov = new Date(mov.fecha);
      return fechaMov.getMonth() === fechaFiltro.mes && fechaMov.getFullYear() === fechaFiltro.anio;
    });

    const ingMes = filtradosDelMes.filter(t => t.tipo === 'ingreso' && (!t.moneda || t.moneda === 'ARS')).reduce((a, c) => a + Number(c.monto), 0);
    const egrMes = filtradosDelMes.filter(t => t.tipo === 'egreso' && (!t.moneda || t.moneda === 'ARS')).reduce((a, c) => a + Number(c.monto), 0);

    setResumen({ saldoTotalArs: saldoHistoricoArs, ingresosMes: ingMes, egresosMes: egrMes });
  }, [movimientos, vistaActiva, perfil, fechaFiltro]);

  const eliminarMovimiento = async (id) => {
    if (!window.confirm('¿Eliminar movimiento?')) return;
    await supabase.from('transacciones').delete().eq('id', id);
    cargarDatosUsuario(); 
  };

  const editarNombreGrupo = async () => {
    const nuevo = window.prompt('Nuevo nombre del espacio compartido:', infoCompartido.nombre);
    if (nuevo && nuevo.trim() !== '') {
      await supabase.from('grupos').update({ nombre: nuevo }).eq('id', perfil.grupo_compartido_id);
      cargarDatosUsuario();
    }
  };

  const eliminarGrupoCompartido = async () => {
    const confirmacion = window.prompt('⚠️ ZONA DE PELIGRO ⚠️\n\nEscribí ELIMINAR para borrar el espacio compartido y todos sus datos:');
    if (confirmacion !== 'ELIMINAR') return;
    setLoading(true);
    try {
      const { error } = await supabase.from('grupos').delete().eq('id', perfil.grupo_compartido_id);
      if (error) throw error;
      alert('Espacio eliminado.');
      setVistaActiva('personal');
      cargarDatosUsuario();
    } catch (error) { alert('Error: ' + error.message); } finally { setLoading(false); }
  };

  // NUEVO: Eliminar Cuenta Completa del Usuario
  const eliminarMiCuenta = async () => {
    const confirmacion = window.prompt('⚠️ ELIMINAR CUENTA DEFINITIVAMENTE ⚠️\n\nEstás a punto de borrar tu usuario, tu billetera personal y todo tu historial de forma irreversible.\n\nPara proceder, escribí: ADIOS');
    
    if (confirmacion !== 'ADIOS') return;
    
    setLoading(true);
    try {
      // 1. Borramos el usuario en el backend (Supabase)
      const { error } = await supabase.rpc('eliminar_mi_cuenta');
      if (error) throw error;
      
      // 2. Destruimos la sesión en el navegador local
      await supabase.auth.signOut();
      
      // 3. Forzamos una recarga completa de la página para limpiar la memoria
      window.location.href = '/';
      
    } catch (error) {
      // Si llega a dar error porque el token ya caducó al borrarse, forzamos la salida igual
      await supabase.auth.signOut();
      window.location.href = '/';
    }
  };

  const cambiarMes = (direccion) => {
    const hoy = new Date();
    setFechaFiltro(prev => {
      let nuevoMes = prev.mes + direccion;
      let nuevoAnio = prev.anio;
      if (nuevoMes > 11) { nuevoMes = 0; nuevoAnio++; }
      if (nuevoMes < 0) { nuevoMes = 11; nuevoAnio--; }
      if (nuevoAnio > hoy.getFullYear() || (nuevoAnio === hoy.getFullYear() && nuevoMes > hoy.getMonth())) return prev;
      return { mes: nuevoMes, anio: nuevoAnio };
    });
  };

  const esMesActual = fechaFiltro.mes === new Date().getMonth() && fechaFiltro.anio === new Date().getFullYear();
  const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const textoMesActual = `${mesesNombres[fechaFiltro.mes]} ${fechaFiltro.anio}`;

  useEffect(() => { if (user) cargarDatosUsuario(); }, [user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Cargando...</div>;
  if (!perfil?.grupo_id) return <Onboarding onGroupCreated={() => { setLoading(true); cargarDatosUsuario(); }} />;
  if (vistaActiva === 'compartido' && !perfil.grupo_compartido_id) return ( <div className="min-h-screen bg-slate-50 pb-10"><nav className="bg-white border-b border-slate-200 px-4 py-4 flex justify-between items-center"><h1 className="text-xl font-bold text-indigo-600 flex items-center gap-2"><Wallet size={24} /> Mi Economía</h1><button onClick={() => setVistaActiva('personal')} className="text-sm text-slate-500">Volver</button></nav><VincularPareja onVinculado={() => cargarDatosUsuario()} /></div> );

  const movimientosDelMesParaMostrar = movimientos.filter(mov => {
    const perteneceAVista = vistaActiva === 'total' ? true : mov.grupo_id === (vistaActiva === 'personal' ? perfil.grupo_id : perfil.grupo_compartido_id);
    const fechaMov = new Date(mov.fecha);
    return perteneceAVista && fechaMov.getMonth() === fechaFiltro.mes && fechaMov.getFullYear() === fechaFiltro.anio;
  });

  const grupoParaGuardar = vistaActiva === 'compartido' ? perfil.grupo_compartido_id : perfil.grupo_id;
  const saldoUsdAMostrar = vistaActiva === 'personal' ? usdPersonal : vistaActiva === 'compartido' ? usdCompartido : usdPersonal + usdCompartido;

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <ModalUsd isOpen={mostrarModalUsd} onClose={() => setMostrarModalUsd(false)} grupoId={grupoParaGuardar} onGuardado={() => cargarDatosUsuario()} />

      <nav className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
              <Wallet size={28} /> Mi Economía
            </h1>
            <div className="md:hidden flex items-center gap-2 text-sm font-medium text-slate-600">
               <User size={16} /> {perfil?.nombre}
            </div>
          </div>
          
          <div className="flex justify-between items-center gap-4">
             <div className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
                <User size={16} /> Hola, {perfil?.nombre}
             </div>
             <button onClick={() => supabase.auth.signOut()} className="text-sm font-medium text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors">
                <LogOut size={16} /> Salir
             </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 mt-2">
        <div className="flex bg-slate-200 p-1 rounded-xl w-full max-w-md mx-auto mb-6 shadow-inner">
          <button onClick={() => setVistaActiva('personal')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-all ${vistaActiva === 'personal' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><User size={18} /> <span className="hidden sm:inline">Mi Billetera</span></button>
          <button onClick={() => setVistaActiva('compartido')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-all ${vistaActiva === 'compartido' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><Users size={18} /> <span className="hidden sm:inline">Compartido</span></button>
          <button onClick={() => setVistaActiva('total')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-all ${vistaActiva === 'total' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><Globe size={18} /> <span className="hidden sm:inline">Total</span></button>
        </div>

        {vistaActiva === 'compartido' && infoCompartido && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <h2 className="text-lg font-bold text-indigo-900">{infoCompartido.nombre}</h2>
                <div className="flex gap-1">
                   <button onClick={editarNombreGrupo} className="text-indigo-400 hover:text-indigo-700 p-1"><Edit size={16}/></button>
                   <button onClick={eliminarGrupoCompartido} className="text-indigo-300 hover:text-red-600 p-1" title="Eliminar espacio compartido"><Trash2 size={16}/></button>
                </div>
              </div>
              <p className="text-sm text-indigo-700">{infoCompartido.integrantes}</p>
            </div>
            <div className="bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm flex items-center gap-2 text-sm">
              <Key size={14} className="text-indigo-400" /> Código: <span className="font-bold text-indigo-600 tracking-widest">{infoCompartido.codigo}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-slate-200 p-2 mb-6 w-full max-w-sm mx-auto">
          <button onClick={() => cambiarMes(-1)} className="p-3 hover:bg-slate-50 rounded-full text-slate-500"><ChevronLeft size={24}/></button>
          <h2 className="font-bold text-slate-800 text-lg capitalize">{textoMesActual}</h2>
          <button onClick={() => cambiarMes(1)} disabled={esMesActual} className={`p-3 rounded-full ${esMesActual ? 'text-slate-200' : 'hover:bg-slate-50 text-slate-500'}`}><ChevronRight size={24}/></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-700 flex flex-col justify-center">
            <p className="text-slate-300 text-sm font-medium mb-1">Saldo Histórico (Total ARS)</p>
            <h2 className={`text-3xl font-bold ${resumen.saldoTotalArs >= 0 ? 'text-white' : 'text-red-300'}`}>{formatearDinero(resumen.saldoTotalArs)}</h2>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div><p className="text-slate-500 text-sm font-medium mb-1">Ingresos {mesesNombres[fechaFiltro.mes]}</p><h2 className="text-2xl font-bold text-green-600">+ {formatearDinero(resumen.ingresosMes)}</h2></div>
            <div className="bg-green-50 p-3 rounded-full"><TrendingUp className="text-green-600" size={24} /></div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div><p className="text-slate-500 text-sm font-medium mb-1">Gastos {mesesNombres[fechaFiltro.mes]}</p><h2 className="text-2xl font-bold text-red-600">- {formatearDinero(resumen.egresosMes)}</h2></div>
            <div className="bg-red-50 p-3 rounded-full"><TrendingDown className="text-red-600" size={24} /></div>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl shadow-sm mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="bg-emerald-100 p-3 rounded-full"><DollarSign className="text-emerald-600" size={24}/></div>
            <div><p className="text-emerald-700 text-sm font-medium">Caja Fuerte (USD)</p><h2 className="text-3xl font-bold text-emerald-900">U$S {saldoUsdAMostrar.toFixed(2)}</h2></div>
          </div>
          {vistaActiva !== 'total' && (
            <button onClick={() => setMostrarModalUsd(true)} className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl hover:bg-emerald-700 font-bold transition-colors w-full sm:w-auto shadow-sm">
              <ArrowRightLeft size={20}/> Gestionar USD
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
            <GraficoGastos movimientos={movimientosDelMesParaMostrar} />

            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Calendar size={20} className="text-indigo-600" /> Movimientos
              </h3>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {movimientosDelMesParaMostrar.length === 0 ? ( <div className="p-8 text-center text-slate-400">Sin movimientos este mes.</div> ) : (
                  <div className="divide-y divide-slate-100">
                    {movimientosDelMesParaMostrar.map((mov) => (
                      <div key={mov.id} className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group ${mov.moneda === 'USD' ? 'bg-emerald-50/30' : ''}`}>
                        <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                          <div className={`flex-shrink-0 p-2 rounded-full ${mov.tipo === 'ingreso' ? (mov.moneda === 'USD' ? 'bg-emerald-100 text-emerald-600' : 'bg-green-100 text-green-600') : 'bg-red-100 text-red-600'}`}>
                            {mov.tipo === 'ingreso' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate pr-2">
                              {mov.descripcion}
                              {mov.moneda === 'USD' && <span className="ml-2 bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">USD</span>}
                            </p>
                            <div className="flex flex-wrap gap-1 text-xs text-slate-500 mt-0.5">
                              <span>{new Date(mov.fecha).toLocaleDateString('es-AR', {day:'2-digit', month:'2-digit'})}</span>
                              {mov.categorias?.nombre && <span className="bg-slate-100 px-1.5 rounded text-slate-600 truncate max-w-[100px]">{mov.categorias?.nombre}</span>}
                              <span className="text-indigo-500 font-medium">{mov.perfiles?.nombre}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                          <div className={`font-bold whitespace-nowrap ${mov.tipo === 'ingreso' ? (mov.moneda === 'USD' ? 'text-emerald-600' : 'text-green-600') : 'text-slate-900'}`}>
                            {mov.tipo === 'egreso' ? '- ' : '+ '}
                            {mov.moneda === 'USD' ? `U$S ${mov.monto}` : `$ ${Math.round(mov.monto).toLocaleString('es-AR')}`}
                          </div>
                          <button onClick={() => eliminarMovimiento(mov.id)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="space-y-6 lg:sticky lg:top-24">
              {vistaActiva !== 'total' ? (
                <TransactionForm grupoActivoId={grupoParaGuardar} onTransactionAdded={() => { cargarDatosUsuario(); setTriggerMetas(prev => prev + 1); }} />
              ) : (
                <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-xl text-center text-indigo-600"><Globe className="mx-auto mb-2" size={32} /><p className="font-medium">Vista Global.</p><p className="text-sm mt-1">Selecciona una billetera para operar.</p></div>
              )}
              {vistaActiva !== 'total' && <MetasAhorro grupoActivoId={grupoParaGuardar} refreshTrigger={triggerMetas} />}
            </div>
          </div>
        </div>
        
        {/* PIE DE PÁGINA CON EL BOTÓN DE ELIMINAR CUENTA */}
        <div className="mt-16 pt-8 border-t border-slate-200 text-center pb-8">
           <button 
             onClick={eliminarMiCuenta} 
             className="text-sm font-medium text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center gap-2 mx-auto"
           >
             <UserX size={16} /> Eliminar mi cuenta definitivamente
           </button>
        </div>

      </main>
    </div>
  );
}