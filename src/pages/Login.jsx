import { useState } from 'react';
import { supabase } from '../services/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet, Eye, EyeOff, ArrowLeft, Mail } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  
  // Estados para UI
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [modoRecuperar, setModoRecuperar] = useState(false); // false = Login, true = Recuperar

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/');
    } catch (error) {
      setError('Credenciales incorrectas. Verificá tu email y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecuperar = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMensaje(null);
    try {
      // Envía el mail de recuperación. Importante: Configurar URL en Supabase Dashboard > Auth > Email Templates
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password', // Opcional, por defecto va al sitio
      });
      if (error) throw error;
      setMensaje('¡Listo! Revisá tu correo (y spam) para restablecer la contraseña.');
    } catch (error) {
      setError('Error al enviar el correo: ' + error.message);
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
          <h2 className="text-2xl font-bold text-slate-800">
            {modoRecuperar ? 'Recuperar Cuenta' : 'Bienvenido de nuevo'}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {modoRecuperar ? 'Te enviaremos un enlace para crear una nueva clave.' : 'Ingresá a tu billetera digital'}
          </p>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 text-center">{error}</div>}
        {mensaje && <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm mb-4 text-center">{mensaje}</div>}

        {/* FORMULARIO */}
        <form onSubmit={modoRecuperar ? handleRecuperar : handleLogin} className="space-y-4">
          
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

          {!modoRecuperar && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <div className="relative">
                <input 
                  type={mostrarPassword ? 'text' : 'password'} 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all pr-10" 
                  placeholder="••••••••" 
                />
                <button 
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  {mostrarPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
              <div className="flex justify-end mt-1">
                <button type="button" onClick={() => setModoRecuperar(true)} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? 'Procesando...' : (modoRecuperar ? 'Enviar Enlace' : 'Ingresar')}
          </button>
        </form>

        {/* Footer del Formulario */}
        <div className="mt-6 text-center pt-4 border-t border-slate-100">
          {modoRecuperar ? (
            <button onClick={() => setModoRecuperar(false)} className="text-sm font-medium text-slate-500 hover:text-indigo-600 flex items-center justify-center gap-1 mx-auto">
              <ArrowLeft size={16} /> Volver al inicio de sesión
            </button>
          ) : (
            <p className="text-sm text-slate-500">
              ¿No tenés cuenta? <Link to="/register" className="font-bold text-indigo-600 hover:text-indigo-800">Registrate gratis</Link>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}