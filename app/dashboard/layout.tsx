'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import Link from 'next/link';
import { LayoutDashboard, Calendar, List, PiggyBank, TrendingUp } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import BalanceModal from '../components/BalanceModal';
import TransactionModal from '../components/TransactionModal';

const fmt = (n: number) => {
  const v = Number(n) || 0;
  return v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, state, loadingData } = useAppContext();
  
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  useEffect(() => {
    if (!loadingData && !user) {
      router.push('/');
    }
  }, [user, loadingData, router]);

  useEffect(() => {
    setIsActionMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  if (loadingData || !user) {
    return <div className="flex h-full items-center justify-center text-[var(--text-soft)] text-[14px]">Cargando tu libreta...</div>;
  }

  const accounts = state.accounts || [];
  
  // === CORRECCIÓN AQUÍ: Ignoramos las cuentas con excludeFromTotal ===
  const realGlobalBalance = accounts.reduce((sum: number, acc: any) => {
    if (acc.excludeFromTotal) return sum;
    return sum + Number(acc.balance || 0);
  }, 0);

  const showPlusButton = pathname === '/dashboard' || pathname === '/dashboard/movimientos';

  const handlePlusClick = () => {
    if (pathname === '/dashboard') {
      setIsBalanceModalOpen(true);
    } else if (pathname === '/dashboard/movimientos') {
      setIsActionMenuOpen(!isActionMenuOpen);
    }
  };

  return (
    <div className="w-full h-full md:max-w-[420px] md:h-[860px] md:mx-auto md:my-8 md:rounded-[36px] md:border-[6px] md:border-[#22222a] bg-[#0D0D12] shadow-2xl flex flex-col relative overflow-hidden">
      
      <header className="bg-[var(--paper)] px-6 pt-7 pb-5 border-b border-[var(--paper-line)] relative shrink-0 z-10">
        <h1 className="font-['Playfair_Display'] text-[20px] font-semibold text-[var(--ink)] m-0 mb-6 tracking-wide">
          MyWalletApp
        </h1>
        <button 
          onClick={handleLogout}
          className="absolute right-6 top-8 bg-transparent border-none text-[var(--text-soft)] text-[11px] uppercase tracking-wider cursor-pointer font-semibold hover:text-[var(--coral)] transition-colors"
        >
          Cerrar sesión
        </button>
        <div className="flex flex-col">
          <p className="text-[13px] text-[var(--gold)] m-0 mb-1 font-medium font-['Inter']">En cuenta ahora</p>
          <p 
            className="font-['IBM_Plex_Mono'] text-[36px] font-medium tracking-tight text-[var(--gold)] m-0 cursor-pointer hover:opacity-80 transition-opacity w-fit"
            onClick={() => setIsBalanceModalOpen(true)}
          >
            {fmt(realGlobalBalance)}
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-28 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {children}
      </main>

      {isActionMenuOpen && (
        <div 
          className="absolute inset-0 z-20" 
          onClick={() => setIsActionMenuOpen(false)}
        />
      )}

      {isActionMenuOpen && showPlusButton && pathname === '/dashboard/movimientos' && (
        <div className="absolute bottom-[170px] right-4 z-30 flex flex-col items-end gap-3 animate-[fade_0.2s_ease]">
          
          <button 
            onClick={() => {
              setIsActionMenuOpen(false);
              router.push('/dashboard/importar');
            }}
            className="flex items-center gap-3 bg-[var(--paper-2)] border border-[var(--gold)] text-[var(--gold)] px-4 py-2.5 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.2)] font-semibold text-[13px] active:scale-95 transition-transform cursor-pointer"
          >
            <span>Escanear con IA</span>
            <span className="text-[16px]">🔮</span>
          </button>

          <button 
            onClick={() => {
              setIsActionMenuOpen(false);
              setIsTxModalOpen(true);
            }}
            className="flex items-center gap-3 bg-[var(--paper-2)] border border-[var(--paper-line)] text-[var(--ink)] px-4 py-2.5 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.2)] font-medium text-[13px] active:scale-95 transition-transform cursor-pointer"
          >
            <span>Añadir Manualmente</span>
            <span className="text-[16px]">✍️</span>
          </button>
        </div>
      )}

      {showPlusButton && (
        <div className="absolute bottom-[110px] right-4 z-30">
          <button 
            onClick={handlePlusClick}
            className={`w-12 h-12 bg-[var(--gold)] text-[#0D0D12] rounded-full flex items-center justify-center text-[28px] font-light shadow-[0_4px_12px_rgba(244,197,99,0.5)] active:scale-90 transition-transform duration-300 cursor-pointer border-none ${isActionMenuOpen ? 'rotate-45' : 'rotate-0'}`}
            title={pathname === '/dashboard' ? "Crear cuenta bancaria" : "Añadir movimiento"}
          >
            +
          </button>
        </div>
      )}

      <nav className="absolute bottom-0 left-0 right-0 bg-[#121218] border-t border-[var(--paper-line)] flex px-1.5 py-3 pb-6 z-20 shrink-0">
        <NavItem href="/dashboard" icon={<LayoutDashboard size={22} />} label="Resumen" active={pathname === '/dashboard'} />
        <NavItem href="/dashboard/presupuesto" icon={<Calendar size={22} />} label="Anual" active={pathname === '/dashboard/presupuesto'} />
        <NavItem href="/dashboard/movimientos" icon={<List size={22} />} label="Movim." active={pathname === '/dashboard/movimientos'} />
        <NavItem href="/dashboard/ahorro" icon={<PiggyBank size={22} />} label="Ahorro" active={pathname === '/dashboard/ahorro'} />
        <NavItem href="/dashboard/inversion" icon={<TrendingUp size={22} />} label="Invers." active={pathname === '/dashboard/inversion'} />
      </nav>

      <BalanceModal isOpen={isBalanceModalOpen} onClose={() => setIsBalanceModalOpen(false)} />
      <TransactionModal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} />
    </div>
  );
}

function NavItem({ href, icon, label, active }: { href: string, icon: React.ReactNode, label: string, active: boolean }) {
  return (
    <Link href={href} className={`flex-1 flex flex-col items-center gap-1.5 p-1.5 transition-colors text-[11px] font-medium no-underline ${active ? 'text-[var(--gold)]' : 'text-[#666677] hover:text-[var(--text-soft)]'}`}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}