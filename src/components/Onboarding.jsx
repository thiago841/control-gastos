import { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Wallet, ArrowRight } from 'lucide-react';

export default function Onboarding({ onGroupCreated }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const configurarCuenta = async () => {
    setLoading(true);
    try {
      // 1. Crear el espacio personal
      const { data: grupo, error: errorGrupo } = await supabase
        .from('grupos')
        .insert([{ nombre: 'Mi Billetera Personal' }])
        .select()
        .single();

      if (errorGrupo) throw errorGrupo;

      // 2. VINCULAR PERFIL (USAMOS UPSERT: Lo crea si no existe, lo actualiza si existe)
      const { error: errorPerfil } = await supabase
        .from('perfiles')
        .upsert({ 
          id: user.id, 
          grupo_id: grupo.id,
          nombre: user.user_metadata?.nombre || 'Mi Usuario' // Rescatamos el nombre del registro
        });

      if (errorPerfil) throw errorPerfil;

      // 3. KIT DE INICIO: Categorías por defecto
      const categoriasDefault = [
        { nombre: 'Sueldo / Honorarios', tipo: 'ingreso', grupo_id: grupo.id },
        { nombre: 'Ventas', tipo: 'ingreso', grupo_id: grupo.id },
        { nombre: 'Supermercado', tipo: 'egreso', grupo_id: grupo.id },
        { nombre: 'Servicios (Luz/Gas/Internet)', tipo: 'egreso', grupo_id: grupo.id },
        { nombre: 'Alquiler / Expensas', tipo: 'egreso', grupo_id: grupo.id },
        { nombre: 'Transporte / Auto', tipo: 'egreso', grupo_id: grupo.id },
        { nombre: 'Salidas / Comida', tipo: 'egreso', grupo_id: grupo.id },
        { nombre: 'Suscripciones', tipo: 'egreso', grupo_id: grupo.id },
        { nombre: 'Salud / Farmacia', tipo: 'egreso', grupo_id: grupo.id }
      ];
      await supabase.from('categorias').insert(categoriasDefault);

      // 4. KIT DE INICIO: Métodos de pago por defecto
      const metodosDefault = [
        { nombre: 'Efectivo', grupo_id: grupo.id },
        { nombre: 'Transferencia', grupo_id: grupo.id },
        { nombre: 'Tarjeta de Débito', grupo_id: grupo.id },
        { nombre: 'Tarjeta de Crédito', grupo_id: grupo.id }
      ];
      await supabase.from('metodos_pago').insert(metodosDefault);

      // Le avisamos al Dashboard que ya está todo listo
      onGroupCreated();
    } catch (error) {
      alert('Error configurando la cuenta: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200">
        <div className="bg-indigo-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Wallet size={40} className="text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Te damos la bienvenida!</h2>
        <p className="text-slate-500 mb-8">
          Estamos preparando tu billetera virtual. Se configurarán automáticamente las categorías y métodos de pago más comunes para que puedas empezar a registrar tus gastos al instante.
        </p>
        <button
          onClick={configurarCuenta}
          disabled={loading}
          className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? 'Preparando todo...' : 'Comenzar a usar la app'} <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}