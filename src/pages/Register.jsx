import { useState } from 'react';
import { supabase } from '../services/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet, Eye, EyeOff, Mail, User as UserIcon } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  
  // Estados del formulario
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Estados de la interfaz
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMensaje(null);

    try {
      // 1. Registramos al usuario en Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre: nombre, // Guardamos el nombre en los metadatos del usuario
          }
        }
      });

      if (error) throw error;

      // 2. Manejo de la redirección según la configuración de Supabase
      // Si Supabase exige confirmar el mail, la sesión viene en null
      if (data?.user && data?.session === null) {
        setMensaje('¡Casi listo! Revisá tu correo (y spam) para confirmar tu cuenta antes de ingresar.');
      } else {
        // Si no exige confirmar el mail, lo mandamos directo al Dashboard (Onboarding)
        navigate('/');
      }
      
    } catch (error) {
      setError('Error al crear la cuenta: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        
        {/* Cabecera */}
        <div className="text-center mb-8">
          <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet size={32} className="text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Crear Cuenta</h2>
          <p className="text-slate-500 text-sm mt-1">
            Comenzá a gestionar tu economía hoy mismo
          </p>
        </div>

        {/* Mensajes de Alerta */}
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 text-center">{error}</div>}
        {mensaje && <div className="bg-green-50 text-green-700 border border-green-200 p-4 rounded-lg text-sm mb-4 text-center font-medium">{mensaje}</div>}

        {/* FORMULARIO */}
        {!mensaje && (
          <form onSubmit={handleRegister} className="space-y-4">
            
            {/* Campo Nombre */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tu Nombre</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                  type="text" 
                  required 
                  value={nombre} 
                  onChange={(e) => setNombre(e.target.value)} 
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                  placeholder="Ej: Juan Pérez" 
                />
              </div>
            </div>

            {/* Campo Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                  placeholder="tu@email.com" 
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <div className="relative">
                <input 
                  type={mostrarPassword ? 'text' : 'password'} 
                  required 
                  minLength={6}
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all pr-10" 
                  placeholder="Mínimo 6 caracteres" 
                />
                <button 
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  {mostrarPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </button>
          </form>
        )}

        {/* Footer del Formulario */}
        <div className="mt-6 text-center pt-4 border-t border-slate-100">
          <p className="text-sm text-slate-500">
            ¿Ya tenés cuenta? <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-800">Ingresar</Link>
          </p>
        </div>

      </div>
    </div>
  );
}