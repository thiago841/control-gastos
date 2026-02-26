import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, ArrowDownCircle, ArrowUpCircle, CreditCard } from 'lucide-react';

export default function TransactionForm({ onTransactionAdded, grupoActivoId }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const [categorias, setCategorias] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [metas, setMetas] = useState([]);

  const obtenerFechaHoraLocal = () => {
    const ahora = new Date();
    ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
    return ahora.toISOString().slice(0, 16);
  };

  const [tipo, setTipo] = useState('egreso');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(obtenerFechaHoraLocal());
  const [categoriaId, setCategoriaId] = useState('');
  const [metodoPagoId, setMetodoPagoId] = useState('');
  const [metaId, setMetaId] = useState('');
  
  // NUEVO: Estado para cuotas
  const [cuotas, setCuotas] = useState(1);
  const [esTarjetaCredito, setEsTarjetaCredito] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      if (!grupoActivoId) return;
      
      const { data: catData } = await supabase.from('categorias').select('*').eq('grupo_id', grupoActivoId);
      if (catData) setCategorias(catData);
      
      const { data: metData } = await supabase.from('metodos_pago').select('*').eq('grupo_id', grupoActivoId);
      if (metData) {
        setMetodosPago(metData);
        if (metData.length > 0) handleMetodoPagoChange(metData[0].id, metData);
      }

      const { data: metasData } = await supabase.from('metas_ahorro').select('*').eq('grupo_id', grupoActivoId);
      if (metasData) setMetas(metasData);
    };
    cargarDatos();
  }, [grupoActivoId]);

  // Detectar si es tarjeta de crédito al cambiar el select
  const handleMetodoPagoChange = (id, listaMetodos = metodosPago) => {
    setMetodoPagoId(id);
    const metodo = listaMetodos.find(m => m.id === id);
    if (metodo && metodo.nombre.toLowerCase().includes('crédito')) {
      setEsTarjetaCredito(true);
    } else {
      setEsTarjetaCredito(false);
      setCuotas(1); // Reseteamos si no es crédito
    }
  };

  const categoriasFiltradas = categorias.filter(c => c.tipo === tipo);

  // NUEVO: Función para agregar categorías rápidamente
  const agregarCategoria = async () => {
    const nuevaCat = window.prompt(`Nueva categoría para ${tipo === 'egreso' ? 'Gastos' : 'Ingresos'}:`);
    if (!nuevaCat || nuevaCat.trim() === '') return;

    try {
      const { data, error } = await supabase.from('categorias').insert([{
        nombre: nuevaCat.trim(),
        tipo: tipo, // Usa el tipo que esté seleccionado en el formulario (ingreso/egreso)
        grupo_id: grupoActivoId
      }]).select().single();

      if (error) throw error;

      // Actualizamos la lista y la seleccionamos automáticamente
      setCategorias(prev => [...prev, data]);
      setCategoriaId(data.id);
      
    } catch (error) {
      alert('Error al crear la categoría: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ texto: '', tipo: '' });

    if (!categoriaId) {
      setMensaje({ texto: 'Selecciona una categoría.', tipo: 'error' });
      setLoading(false);
      return;
    }

    try {
      const montoTotal = Number(monto);
      const montoCuota = montoTotal / cuotas;
      
      // Vamos a preparar un array de promesas para insertar todas las cuotas juntas
      const transaccionesAInsertar = [];

      for (let i = 0; i < cuotas; i++) {
        // Calcular la fecha de cada cuota (Mes actual + i)
        const fechaCuota = new Date(fecha);
        fechaCuota.setMonth(fechaCuota.getMonth() + i);
        
        // Ajuste para evitar errores de fecha (ej: 31 de feb)
        // Convertimos a string ISO
        const fechaISO = fechaCuota.toISOString().slice(0, 16); // Mantiene la hora original

        const descripcionFinal = cuotas > 1 
          ? `${descripcion} (Cuota ${i + 1}/${cuotas})` 
          : descripcion;

        const nuevaTransaccion = {
          descripcion: descripcionFinal,
          monto: cuotas > 1 ? montoCuota : montoTotal, // Si son cuotas, dividimos el monto
          tipo,
          fecha: fechaISO, // Cada una con su fecha futura
          usuario_id: user.id,
          categoria_id: categoriaId,
          metodo_pago_id: metodoPagoId,
          grupo_id: grupoActivoId,
          moneda: 'ARS' // Asumimos pesos para las cuotas por ahora
        };

        if (metaId && tipo === 'egreso') nuevaTransaccion.meta_id = metaId;
        
        transaccionesAInsertar.push(nuevaTransaccion);
      }

      // 1. Insertamos TODAS las cuotas en la base de datos
      const { error } = await supabase.from('transacciones').insert(transaccionesAInsertar);
      if (error) throw error;

      // 2. Si era para una meta, sumamos el TOTAL a la meta (no por cuotas, sino el compromiso total)
      // Opcional: Podrías querer sumar solo lo pagado, pero usualmente uno "aparta" el valor total.
      // Por simplicidad, sumaremos el monto de la PRIMERA cuota al progreso actual si es inmediata.
      // Pero mejor, sumemos el monto de la transacción *actual* (la cuota 1).
      if (metaId && tipo === 'egreso') {
        const metaSeleccionada = metas.find(m => m.id === metaId);
        if (metaSeleccionada) {
          const aporte = cuotas > 1 ? montoCuota : montoTotal;
          const nuevoMontoAhorrado = Number(metaSeleccionada.monto_actual) + aporte;
          await supabase.from('metas_ahorro').update({ monto_actual: nuevoMontoAhorrado }).eq('id', metaId);
        }
      }

      setMensaje({ texto: cuotas > 1 ? `✅ ¡Listo! Se generaron ${cuotas} gastos futuros.` : '✅ Movimiento guardado.', tipo: 'exito' });
      
      setMonto('');
      setDescripcion('');
      setCategoriaId('');
      setMetaId('');
      setCuotas(1);
      
      if (onTransactionAdded) onTransactionAdded();
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 3000);

    } catch (error) {
      console.error('Error:', error);
      setMensaje({ texto: '❌ Error: ' + error.message, tipo: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!grupoActivoId) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <PlusCircle className="text-indigo-600" size={24} /> Nuevo Movimiento
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Botones Ingreso / Gasto */}
        <div className="flex gap-2 mb-4">
          <button type="button" onClick={() => { setTipo('egreso'); setCategoriaId(''); setMetaId(''); }} className={`flex-1 py-2 px-4 rounded-lg flex justify-center items-center gap-2 font-medium transition-colors ${tipo === 'egreso' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'}`}>
            <ArrowDownCircle size={18} /> Gasto / Ahorro
          </button>
          <button type="button" onClick={() => { setTipo('ingreso'); setCategoriaId(''); setMetaId(''); }} className={`flex-1 py-2 px-4 rounded-lg flex justify-center items-center gap-2 font-medium transition-colors ${tipo === 'ingreso' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'}`}>
            <ArrowUpCircle size={18} /> Ingreso
          </button>
        </div>

        {/* Selector de Meta */}
        {tipo === 'egreso' && metas.length > 0 && (
          <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
            <label className="block text-sm font-bold text-indigo-900 mb-1">🎯 ¿Aportar a una Meta?</label>
            <select value={metaId} onChange={(e) => setMetaId(e.target.value)} className="w-full px-3 py-2 border border-indigo-200 rounded-md focus:ring-indigo-500 bg-white text-sm">
              <option value="">No, es un gasto común</option>
              {metas.map(m => <option key={m.id} value={m.id}>Ahorrar para: {m.nombre}</option>)}
            </select>
          </div>
        )}

        {/* Monto y Fecha */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto Total ($)</label>
            <input type="number" step="0.01" required value={monto} onChange={(e) => setMonto(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500" placeholder="0.00" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
            <input type="datetime-local" required value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 text-sm" />
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
          <input type="text" required value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500" placeholder="Ej: Zapatillas..." />
        </div>

        {/* Categoría y Método de Pago */}
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="flex justify-between items-end mb-1">
              <label className="block text-sm font-medium text-slate-700">Categoría</label>
              {/* BOTÓN NUEVO */}
              <button 
                type="button" 
                onClick={agregarCategoria} 
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold tracking-wide"
              >
                + NUEVA
              </button>
            </div>
            <select required value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 bg-white">
              <option value="" disabled>Seleccionar...</option>
              {categoriasFiltradas.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Método de Pago</label>
            <select required value={metodoPagoId} onChange={(e) => handleMetodoPagoChange(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 bg-white">
              {metodosPago.map(met => <option key={met.id} value={met.id}>{met.nombre}</option>)}
            </select>
          </div>
        </div>

        {/* SECCIÓN ESPECIAL: CUOTAS (Solo si es Tarjeta de Crédito) */}
        {esTarjetaCredito && tipo === 'egreso' && (
          <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 mb-2 text-indigo-700 font-bold">
              <CreditCard size={18} />
              <span>Plan de Cuotas</span>
            </div>
            <div className="flex gap-4 items-center">
              <div className="w-1/3">
                <label className="block text-xs font-medium text-slate-500 mb-1">Cant. Cuotas</label>
                <select value={cuotas} onChange={(e) => setCuotas(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 bg-white">
                  {[1, 3, 6, 9, 12, 18, 24].map(num => <option key={num} value={num}>{num} cuotas</option>)}
                </select>
              </div>
              <div className="w-2/3">
                <p className="text-xs text-slate-500">Valor de cada cuota:</p>
                <p className="text-lg font-bold text-slate-800">
                  {monto ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto / cuotas) : '$ 0'}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Se crearán gastos futuros automáticamente para los próximos {cuotas} meses.
            </p>
          </div>
        )}
        
        {mensaje.texto && (
          <div className={`p-3 rounded-md text-sm font-medium text-center ${mensaje.tipo === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {mensaje.texto}
          </div>
        )}

        <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white font-medium py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 mt-2">
          {loading ? 'Procesando...' : 'Guardar Movimiento'}
        </button>
      </form>
    </div>
  );
}