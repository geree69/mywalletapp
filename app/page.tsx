'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useRouter } from 'next/navigation';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter(); // <-- Herramienta para navegar

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        router.push('/dashboard'); // <-- Te lleva dentro de la app
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        router.push('/dashboard');
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') {
        setError("Error: El correo o la contraseña son incorrectos.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("Error: Este correo ya está registrado.");
      } else if (err.code === 'auth/weak-password') {
        setError("Error: La contraseña debe tener al menos 6 caracteres.");
      } else {
        setError(err.message || "Error al autenticar");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-[var(--body-bg)] z-[100] flex flex-col items-center justify-center">
      <div className="bg-[var(--paper)] border border-[var(--paper-line)] rounded-[24px] p-10 w-[90%] max-w-[360px] shadow-2xl">
        <h2 className="font-['Playfair_Display'] text-center text-[28px] text-[var(--gold)] m-0 mb-2">Financial Care</h2>
        <h3 className="font-['Inter'] text-[16px] font-medium text-center text-[var(--ink)] m-0 mb-6">
          {isLogin ? 'Iniciar sesión' : 'Crear nueva cuenta'}
        </h3>
        
        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <div className="relative">
            <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">Correo electrónico</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)]"
              required
            />
          </div>
          
          <div className="relative">
            <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">Contraseña</label>
            <input 
              type={showPassword ? "text" : "password"} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="******"
              className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)] pr-12"
              required
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[34px] bg-transparent border-none text-[var(--text-soft)] text-[11px] font-semibold uppercase tracking-wider cursor-pointer hover:text-[var(--ink)]"
            >
              Ver
            </button>
          </div>

          {error && (
            <p className="text-[var(--coral)] text-[12px] text-center m-0 mt-2 p-2 rounded-[6px] bg-[rgba(252,165,165,0.1)]">
              {error}
            </p>
          )}
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-4 bg-[var(--gold)] text-[#0D0D12] font-semibold text-[14px] p-3 rounded-[10px] border-none cursor-pointer active:scale-95 transition-transform disabled:opacity-60"
          >
            {loading ? 'Cargando...' : (isLogin ? 'Entrar' : 'Crear cuenta')}
          </button>
        </form>

        <button 
          onClick={() => { setIsLogin(!isLogin); setError(''); }}
          className="w-full mt-4 bg-transparent border-none text-[var(--text-soft)] text-[13px] cursor-pointer underline hover:text-[var(--ink)]"
        >
          {isLogin ? '¿No tienes cuenta? Crea una aquí' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </div>
    </div>
  );
}