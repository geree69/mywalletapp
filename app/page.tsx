'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAppContext } from './context/AppContext';

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { user, loadingData } = useAppContext();

  // Si ya está logueado, redirigir automáticamente al dashboard
  if (!loadingData && user) {
    router.push('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError('Correo o contraseña incorrectos, o usuario ya existente.');
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div className="w-full max-w-[380px] bg-[var(--paper)] border border-[var(--paper-line)] rounded-[20px] p-6 shadow-xl flex flex-col space-y-6">
        
        <div className="text-center space-y-1">
          <h1 className="font-['Playfair_Display'] text-[24px] font-bold text-[var(--ink)] m-0">
            MyWalletApp
          </h1>
          <p className="text-[12px] text-[var(--text-soft)] m-0">
            {isRegistering ? 'Crea tu cuenta financiera' : 'Inicia sesión en tu libreta'}
          </p>
        </div>

        {error && (
          <div className="bg-[rgba(235,110,93,0.1)] border border-[var(--coral)] text-[var(--coral)] text-[12px] p-3 rounded-[10px] text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-soft)] mb-1">Correo electrónico</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@email.com"
              className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[13px] outline-none focus:border-[var(--gold)]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[var(--text-soft)] mb-1">Contraseña</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[13px] outline-none focus:border-[var(--gold)]"
            />
          </div>

          <button 
            type="submit"
            className="w-full py-3 bg-[var(--gold)] text-[#0D0D12] font-semibold text-[13px] rounded-[10px] border-none cursor-pointer hover:opacity-95 transition-opacity mt-2"
          >
            {isRegistering ? 'Registrarse' : 'Entrar'}
          </button>
        </form>

        <div className="text-center">
          <button 
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            className="bg-transparent border-none text-[var(--gold)] text-[12px] cursor-pointer hover:underline font-medium"
          >
            {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate aquí'}
          </button>
        </div>

      </div>
    </div>
  );
}