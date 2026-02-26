import { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { X, DollarSign, RefreshCw, ArrowDownToLine } from 'lucide-react';

export default function ModalUsd({ isOpen, onClose, grupoId, onGuardado }) {
  const { user } = useAuth();
  const [tipoMovimiento, setTipoMovimiento] = useState('ingreso'); // 'ingreso' o 'retiro'
  const [origen, setOrigen] = useState('salario'); // 'salario' o 'limpio'
  
  const [montoUsd, setMontoUsd] = useState('');
  const [cotizacion, setCotizacion] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !grupoId) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const usd = Number(montoUsd);
      const cotiz = Number(cotizacion);
      
      // Obtenemos la fecha local exacta
      const ahora = new Date();
      ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
      const fecha = ahora.toISOString().slice(0, 16);

      // 1. SI SE COMPRÓ CON EL SALARIO (Genera un Egreso en Pesos)
      if (tipoMovimiento === 'ingreso' && origen === 'salario') {
        const montoPesos = usd * cotiz;
        if (isNaN(montoPesos) || montoPesos <= 0) throw new Error("Cotización inválida");

        await supabase.from('transacciones').insert([{
          descripcion: `Compra de Dólares (U$S ${usd})`,
          monto: montoPesos,
          tipo: 'egreso',
          moneda: 'ARS',
          fecha: fecha,
          usuario_id: user.id,
          grupo_id: grupoId
        }]);
      }

      // 2. REGISTRAMOS EL MOVIMIENTO EN DÓLARES (Para el historial detallado)
      let descripcionUsd = 'Ingreso de Dólares';
      if (tipoMovimiento === 'ingreso' && origen === 'salario') descripcionUsd = `Compra (Cotización: $${cotiz})`;
      if (tipoMovimiento === 'retiro') descripcionUsd = 'Retiro de Dólares';

      await supabase.from('transacciones').insert([{
        descripcion: descripcionUsd,
        monto: usd,
        tipo: tipoMovimiento === 'ingreso' ? 'ingreso' : 'egreso',
        moneda: 'USD',
        fecha: fecha,
        usuario_id: user.id,
        grupo_id: grupoId
      }]);

      onGuardado(); // Avisamos al Dashboard que recargue
      onClose();    // Cerramos el modal
      
      // Limpiamos los campos
      setMontoUsd(''); setCotizacion(''); setOrigen('salario');
    } catch (error) {
      alert('Error al registrar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Cabecera del Modal */}
        <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center text-white">
          <h3 className="font-bold flex items-center gap-2"><DollarSign size={20}/> Gestión de Dólares</h3>
          <button onClick={onClose} className="hover:bg-emerald-700 p-1 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Selector: Ingresar o Retirar */}
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button type="button" onClick={() => setTipoMovimiento('ingreso')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${tipoMovimiento === 'ingreso' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}>Ingresar USD</button>
            <button type="button" onClick={() => setTipoMovimiento('retiro')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${tipoMovimiento === 'retiro' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500'}`}>Retirar USD</button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Monto en Dólares (U$S)</label>
              <input type="number" step="0.01" required value={montoUsd} onChange={(e) => setMontoUsd(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-emerald-500 outline-none" placeholder="100.00" />
            </div>

            {/* Opciones solo para INGRESO */}
            {tipoMovimiento === 'ingreso' && (
              <>
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-sm font-bold text-slate-800 mb-2">¿De dónde salen estos dólares?</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setOrigen('salario')} className={`flex flex-col items-center p-3 rounded-lg border text-sm transition-colors ${origen === 'salario' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                      <RefreshCw size={20} className="mb-1" /> Los compré con mis Pesos
                    </button>
                    <button type="button" onClick={() => setOrigen('limpio')} className={`flex flex-col items-center p-3 rounded-lg border text-sm transition-colors ${origen === 'limpio' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                      <ArrowDownToLine size={20} className="mb-1" /> Ingresan limpios (Ahorro/Regalo)
                    </button>
                  </div>
                </div>

                {/* Si eligió comprarlos, pedimos la cotización */}
                {origen === 'salario' && (
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                    <label className="block text-sm font-medium text-orange-800 mb-1">¿A cuánto pagaste cada dólar? ($ARS)</label>
                    <input type="number" step="0.01" required value={cotizacion} onChange={(e) => setCotizacion(e.target.value)} className="w-full px-3 py-2 border border-orange-200 rounded-md focus:ring-orange-500 outline-none" placeholder="Ej: 1050.50" />
                    {montoUsd && cotizacion && (
                      <p className="text-xs text-orange-600 mt-2 font-medium">
                        Se descontarán ${new Intl.NumberFormat('es-AR').format(montoUsd * cotizacion)} de tu saldo en pesos.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <button type="submit" disabled={loading} className={`w-full py-3 rounded-lg font-bold text-white transition-colors ${tipoMovimiento === 'ingreso' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
            {loading ? 'Procesando...' : tipoMovimiento === 'ingreso' ? 'Guardar Ingreso' : 'Registrar Retiro'}
          </button>
        </form>
      </div>
    </div>
  );
}