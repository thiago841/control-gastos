import { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Users, Key, Copy, Check } from 'lucide-react';

export default function VincularPareja({ onVinculado }) {
  const { user } = useAuth();
  const [codigoIngresado, setCodigoIngresado] = useState('');
  const [nombreEspacio, setNombreEspacio] = useState('');
  const [miCodigoGenerado, setMiCodigoGenerado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [copiado, setCopiado] = useState(false);

  const generarCodigo = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const crearGrupoCompartido = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ texto: '', tipo: '' });
    const nuevoCodigo = generarCodigo();

    try {
      // 1. Crear el grupo
      const { data: grupo, error: errorGrupo } = await supabase
        .from('grupos')
        .insert([{ nombre: nombreEspacio, codigo_invitacion: nuevoCodigo }])
        .select()
        .single();

      if (errorGrupo) throw errorGrupo;

      // 2. Vincular mi perfil
      const { error: errorPerfil } = await supabase
        .from('perfiles')
        .update({ grupo_compartido_id: grupo.id })
        .eq('id', user.id);

      if (errorPerfil) throw errorPerfil;

      // 3. PLANTILLA DE CATEGORÍAS (Esto se aplicará a todos los grupos nuevos)
      const categoriasDefault = [
        // Ingresos
        { nombre: 'Fondo Común', tipo: 'ingreso', grupo_id: grupo.id },
        { nombre: 'Regalos', tipo: 'ingreso', grupo_id: grupo.id },
        // Egresos
        { nombre: 'Supermercado', tipo: 'egreso', grupo_id: grupo.id },
        { nombre: 'Alquiler/Expensas', tipo: 'egreso', grupo_id: grupo.id },
        { nombre: 'Servicios (Luz/Gas/Internet)', tipo: 'egreso', grupo_id: grupo.id },
        { nombre: 'Salidas/Cenas', tipo: 'egreso', grupo_id: grupo.id },
        { nombre: 'Delivery', tipo: 'egreso', grupo_id: grupo.id },
        { nombre: 'Auto/Transporte', tipo: 'egreso', grupo_id: grupo.id },
        { nombre: 'Mascotas', tipo: 'egreso', grupo_id: grupo.id },
        { nombre: 'Farmacia/Salud', tipo: 'egreso', grupo_id: grupo.id },
        { nombre: 'Varios', tipo: 'egreso', grupo_id: grupo.id },
      ];
      await supabase.from('categorias').insert(categoriasDefault);

      // 4. PLANTILLA DE MÉTODOS DE PAGO (Vital para que funcionen las cuotas)
      const metodosDefault = [
        { nombre: 'Efectivo', grupo_id: grupo.id },
        { nombre: 'Transferencia', grupo_id: grupo.id },
        { nombre: 'Tarjeta de Débito', grupo_id: grupo.id },
        { nombre: 'Tarjeta de Crédito', grupo_id: grupo.id } // <--- Importante para detectar cuotas
      ];
      await supabase.from('metodos_pago').insert(metodosDefault);

      setMiCodigoGenerado(nuevoCodigo);
      setMensaje({ texto: '¡Espacio creado! Comparte este código.', tipo: 'exito' });
    } catch (error) {
      setMensaje({ texto: 'Error: ' + error.message, tipo: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const unirseConCodigo = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ texto: '', tipo: '' });

    try {
      const { data: grupo, error: errorBusqueda } = await supabase.from('grupos').select('id').eq('codigo_invitacion', codigoIngresado).single();
      if (errorBusqueda || !grupo) throw new Error('Código inválido.');

      const { error: errorPerfil } = await supabase.from('perfiles').update({ grupo_compartido_id: grupo.id }).eq('id', user.id);
      if (errorPerfil) throw errorPerfil;

      setMensaje({ texto: '✅ ¡Te has unido exitosamente!', tipo: 'exito' });
      setTimeout(() => onVinculado(), 2000); 
    } catch (error) {
      setMensaje({ texto: '❌ ' + error.message, tipo: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const copiarAlPortapapeles = () => {
    navigator.clipboard.writeText(miCodigoGenerado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-2xl mx-auto mt-8">
      <div className="flex justify-center mb-4"><div className="bg-indigo-100 p-4 rounded-full text-indigo-600"><Users size={32} /></div></div>
      <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Modo Pareja</h2>
      <p className="text-slate-500 text-center mb-8">Administren gastos en conjunto.</p>

      {!miCodigoGenerado ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="border border-slate-200 p-6 rounded-xl">
            <h3 className="font-bold text-slate-800 mb-2">Crear Espacio Nuevo</h3>
            <form onSubmit={crearGrupoCompartido} className="flex flex-col gap-3">
              <input type="text" required value={nombreEspacio} onChange={(e) => setNombreEspacio(e.target.value)} placeholder="Nombre (Ej: Nuestro Hogar)" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 text-sm" />
              <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white font-medium py-2 rounded-md hover:bg-indigo-700 transition">{loading ? 'Creando...' : 'Generar Código'}</button>
            </form>
          </div>
          <div className="border border-slate-200 p-6 rounded-xl flex flex-col justify-between">
            <div><h3 className="font-bold text-slate-800 mb-2">Unirse a un Espacio</h3><p className="text-sm text-slate-500 mb-4">Si ya crearon el espacio, ingresa el código aquí.</p></div>
            <form onSubmit={unirseConCodigo} className="w-full flex gap-2">
              <input type="text" required maxLength={6} value={codigoIngresado} onChange={(e) => setCodigoIngresado(e.target.value.toUpperCase())} placeholder="EJ: A1B2C3" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 text-center font-bold tracking-widest uppercase" />
              <button type="submit" disabled={loading || !codigoIngresado} className="bg-slate-900 text-white p-2 rounded-md hover:bg-slate-800"><Key size={20} /></button>
            </form>
          </div>
        </div>
      ) : (
        <div className="max-w-sm mx-auto bg-slate-50 border border-slate-200 p-6 rounded-xl text-center">
          <h3 className="font-bold text-slate-800 mb-4">¡Tu código está listo!</h3>
          <div className="flex items-center justify-center gap-4 mb-6"><span className="text-4xl font-black text-indigo-600 tracking-widest">{miCodigoGenerado}</span><button onClick={copiarAlPortapapeles} className="text-slate-400 hover:text-indigo-600 transition">{copiado ? <Check size={24} className="text-green-500"/> : <Copy size={24} />}</button></div>
          <button onClick={() => onVinculado()} className="w-full bg-slate-900 text-white font-medium py-2 px-4 rounded-md">¡Listo, ya lo compartí!</button>
        </div>
      )}
    </div>
  );
}