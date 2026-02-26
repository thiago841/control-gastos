import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Target, Plus, Trash2, TrendingUp, Edit, MinusCircle } from 'lucide-react';

export default function MetasAhorro({ grupoActivoId, refreshTrigger }) {
  const [metas, setMetas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [nombre, setNombre] = useState('');
  const [montoObjetivo, setMontoObjetivo] = useState('');
  const [montoActual, setMontoActual] = useState('');
  const [fechaLimite, setFechaLimite] = useState('');

  const formatearDinero = (monto) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(monto);

  const cargarMetas = async () => {
    if (!grupoActivoId) return;
    const { data, error } = await supabase.from('metas_ahorro').select('*').eq('grupo_id', grupoActivoId).order('fecha_limite', { ascending: true });
    if (!error && data) setMetas(data);
  };

  useEffect(() => { cargarMetas(); }, [grupoActivoId, refreshTrigger]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('metas_ahorro').insert([{
        nombre, monto_objetivo: Number(montoObjetivo), monto_actual: Number(montoActual || 0), fecha_limite: `${fechaLimite}-01`, grupo_id: grupoActivoId
      }]);
      if (error) throw error;
      setNombre(''); setMontoObjetivo(''); setMontoActual(''); setFechaLimite(''); setMostrarFormulario(false);
      cargarMetas();
    } catch (error) { alert('Error: ' + error.message); } finally { setLoading(false); }
  };

  const eliminarMeta = async (idMeta) => {
    if (!window.confirm('¿Seguro que querés eliminar este objetivo de ahorro?')) return;
    await supabase.from('metas_ahorro').delete().eq('id', idMeta);
    cargarMetas();
  };

  // NUEVO: Función para editar nombre
  const editarNombreMeta = async (meta) => {
    const nuevoNombre = window.prompt('Nuevo nombre para tu meta:', meta.nombre);
    if (!nuevoNombre || nuevoNombre.trim() === '') return;
    await supabase.from('metas_ahorro').update({ nombre: nuevoNombre }).eq('id', meta.id);
    cargarMetas();
  };

  // NUEVO: Función para retirar dinero
  const retirarDinero = async (meta) => {
    const input = window.prompt(`¿Cuánto querés retirar de "${meta.nombre}"?\nTenés ahorrado: $${meta.monto_actual}`);
    if (input === null) return;
    
    const monto = Number(input.replace(',', '.'));
    if (isNaN(monto) || monto <= 0 || monto > meta.monto_actual) {
      alert('Monto inválido. Asegurate de no superar lo que tenés ahorrado.');
      return;
    }

    const nuevoSaldo = meta.monto_actual - monto;
    await supabase.from('metas_ahorro').update({ monto_actual: nuevoSaldo }).eq('id', meta.id);
    alert(`Retiraste ${formatearDinero(monto)}. Recuerda registrar este ingreso en tu billetera si lo vas a gastar.`);
    cargarMetas();
  };

  const calcularAhorroMensual = (objetivo, actual, fechaLim) => {
    const hoy = new Date(); const limite = new Date(fechaLim);
    let meses = (limite.getFullYear() - hoy.getFullYear()) * 12 - hoy.getMonth() + limite.getMonth();
    if (meses <= 0) meses = 1;
    const faltante = objetivo - actual;
    return faltante <= 0 ? 0 : faltante / meses;
  };

  if (!grupoActivoId) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Target className="text-indigo-600" size={24} /> Ahorros</h3>
        <button onClick={() => setMostrarFormulario(!mostrarFormulario)} className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-md hover:bg-indigo-100 flex items-center gap-1">
          {mostrarFormulario ? 'Cancelar' : <><Plus size={16} /> Nueva Meta</>}
        </button>
      </div>

      {mostrarFormulario && (
        <form onSubmit={handleSubmit} className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">¿Para qué estamos ahorrando?</label>
            <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 text-sm" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Monto Total ($)</label>
              <input type="number" required value={montoObjetivo} onChange={(e) => setMontoObjetivo(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 text-sm" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Ya tengo ($)</label>
              <input type="number" value={montoActual} onChange={(e) => setMontoActual(e.target.value)} placeholder="0" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">¿Para cuándo lo querés?</label>
            <input type="month" required value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 text-sm" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white font-medium py-2 rounded-md hover:bg-indigo-700">Guardar</button>
        </form>
      )}

      <div className="space-y-4">
        {metas.map((meta) => {
          const porcentaje = Math.min(Math.round((meta.monto_actual / meta.monto_objetivo) * 100), 100);
          const ahorroSugerido = calcularAhorroMensual(meta.monto_objetivo, meta.monto_actual, meta.fecha_limite);
          
          return (
            <div key={meta.id} className="border border-slate-200 rounded-xl p-4 hover:border-indigo-200 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-800">{meta.nombre}</h4>
                  <button onClick={() => editarNombreMeta(meta)} className="text-slate-400 hover:text-indigo-600"><Edit size={14}/></button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => retirarDinero(meta)} className="text-slate-400 hover:text-orange-500 p-1" title="Retirar dinero"><MinusCircle size={16} /></button>
                  <button onClick={() => eliminarMeta(meta.id)} className="text-slate-400 hover:text-red-500 p-1" title="Eliminar meta"><Trash2 size={16} /></button>
                </div>
              </div>
              
              <p className="text-sm text-slate-500 mb-2">Progreso: {formatearDinero(meta.monto_actual)} de {formatearDinero(meta.monto_objetivo)}</p>
              <div className="w-full bg-slate-100 rounded-full h-2.5 mb-3 overflow-hidden">
                <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${porcentaje}%` }}></div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{porcentaje}% completado</span>
                {porcentaje < 100 && (
                  <span className="flex items-center gap-1 text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md">
                    <TrendingUp size={14} className="text-green-500" />
                    Sugerido: <strong className="text-slate-900">{formatearDinero(ahorroSugerido)}</strong> / mes
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}