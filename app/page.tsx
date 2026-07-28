'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from './context/AppContext';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase'; // ✨ RUTA CORREGIDA

export default function LoginPage() {
  const { user, loadingData } = useAppContext();
  const router = useRouter();
  
  const [isLogin, setIsLogin] = useState(true); // Controla si estamos en modo Login o Registro
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Redirigir si ya hay sesión iniciada
  useEffect(() => {
    if (!loadingData && user) {
      router.push('/dashboard');
    }
  }, [loadingData, user, router]);

  if (loadingData || user) {
    return (
      <div className="flex justify-center items-center h-screen bg-[var(--background)] text-[var(--text-soft)] text-[13px]">
        Cargando sesión...
      </div>
    );
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isLogin) {
        // Intentamos INICIAR sesión
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Intentamos CREAR cuenta nueva
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Error de autenticación:", err);
      // Mensajes de error más amigables
      if (err.code === 'auth/email-already-in-use') {
        setError('Este correo ya está registrado.');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setError(isLogin ? 'Correo o contraseña incorrectos.' : 'Error al crear la cuenta.');
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-[var(--background)]">
      <div className="w-full max-w-md bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-6 shadow-sm">
        <h1 className="font-['Playfair_Display'] text-[22px] font-semibold text-[var(--ink)] mb-4 text-center">
          {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
        </h1>
        
        <form onSubmit={handleAuth} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-[12px] p-3 rounded-[8px] text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-[var(--text-soft)] uppercase mb-1">Correo electrónico</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] text-[13px] outline-none focus:border-[var(--gold)] transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[var(--text-soft)] uppercase mb-1">Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] text-[13px] outline-none focus:border-[var(--gold)] transition-colors"
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-[var(--gold)] text-[#0D0D12] font-semibold text-[14px] p-3 rounded-[10px] border-none cursor-pointer active:scale-95 transition-transform mt-2 shadow-sm"
          >
            {isLogin ? 'Entrar' : 'Registrarse'}
          </button>
        </form>

        {/* Botón para cambiar entre Login y Registro */}
        <p className="text-center text-[12px] text-[var(--text-soft)] mt-5">
          {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button 
            type="button" 
            onClick={() => {
              setIsLogin(!isLogin);
              setError(''); // Limpiamos errores al cambiar de modo
            }}
            className="text-[var(--gold)] font-semibold hover:underline"
          >
            {isLogin ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>

      </div>
    </div>
  );
}