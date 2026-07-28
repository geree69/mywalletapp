'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import BalanceModal from '../components/BalanceModal';

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const fmt = (n: number) => {
  const v = Number(n) || 0;
  return v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
};

// ARREGLO: Ahora entiende tanto las palabras antiguas como las nuevas de la base de datos
const getAccountTypeLabel = (type: string) => {
  if (type === 'savings' || type === 'ahorro') return 'Ahorro';
  if (type === 'both' || type === 'ambas') return 'Día a día y Ahorro';
  if (type === 'cash') return 'Efectivo';
  return 'Día a día'; // Fallback para 'daily'
};

export default function ResumenPage() {
  const { state, saveState } = useAppContext();
  
  // ARREGLO: Volvemos a tener estados para abrir modal de crear o modal de editar
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);

  const openCreateModal = () => {
    setEditingAccount(null);
    setIsBalanceModalOpen(true);
  };

  const openEditModal = (acc: any) => {
    setEditingAccount(acc);
    setIsBalanceModalOpen(true);
  };
  
  const accounts = state.accounts || [];
  
  // Sumamos el dinero de las cuentas EXCEPTO las ocultas
  const totalBalance = accounts.reduce((sum: number, acc: any) => {
    if (acc.excludeFromTotal) return sum;
    return sum + Number(acc.balance || 0);
  }, 0);

  const sortedTransactions = useMemo(() => {
    return [...(state.transactions || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [state.transactions]);

  // ✨ AQUÍ ESTÁ LA MAGIA CORREGIDA
  const { currentMonthExpense, currentMonthIncome, remainingBudget, effectiveMonthlyBudget, spentPct, monthName, isOverBudget } = useMemo(() => {
    const d = new Date();
    const currentMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const mName = MONTH_NAMES[d.getMonth()];

    const annualBudget = Number(state.annualBudget || 0);
    const baseMonthly = annualBudget / 12;

    let expense = 0;
    let actualIncomeThisMonth = 0; // Dinero real que entra al banco (Liquidez)
    let proratedIncomeThisMonth = 0; // Dinero contable para el presupuesto (Repartido)

    (state.transactions || []).forEach((t: any) => {
      const tKey = (t.date && t.date.length >= 7) ? t.date.slice(0, 7) : '';

      // 1. LIQUIDEZ: ¿Entró o salió dinero real este mes?
      if (tKey === currentMonthKey) {
        if (t.type === 'income') {
          actualIncomeThisMonth += Number(t.amount || 0); // Si el bono entró este mes, lo suma íntegro
        } else if (t.type === 'expense') {
          expense += Math.abs(Number(t.amount || 0));
        }
      }

      // 2. CONTABILIDAD/PRESUPUESTO: ¿De cuánto dinero dispongo este mes para gastar?
      if (t.type === 'income') {
        if (t.split && Array.isArray(t.splitDetail)) {
          // Si es un ingreso repartido, buscamos el "trocito" que nos toca este mes
          const entry = t.splitDetail.find((detail: any) => detail.key === currentMonthKey);
          if (entry) {
            proratedIncomeThisMonth += entry.amount;
          }
        } else if (tKey === currentMonthKey) {
          // Si es un ingreso normal de este mes, se suma entero al presupuesto
          proratedIncomeThisMonth += Number(t.amount || 0);
        }
      }
    });

    const currentIncome = actualIncomeThisMonth; // Lo que ves en "Ingresado" (Real)
    const effective = baseMonthly + proratedIncomeThisMonth; // Base + trocitos repartidos
    const remaining = effective - expense;
    const over = expense > effective;
    const pct = effective > 0 ? Math.min(100, (expense / effective) * 100) : 0;

    return {
      currentMonthExpense: expense,
      currentMonthIncome: currentIncome,
      remainingBudget: remaining,
      effectiveMonthlyBudget: effective,
      spentPct: pct,
      monthName: mName,
      isOverBudget: over
    };
  }, [state.transactions, state.annualBudget]);

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('¿Seguro que quieres borrar esta cuenta de forma permanente?')) return;
    const updatedAccounts = accounts.filter((acc: any) => acc.id !== id);
    
    const newGlobalBalance = updatedAccounts.reduce((sum: number, acc: any) => {
      if (acc.excludeFromTotal) return sum;
      return sum + Number(acc.balance || 0);
    }, 0);
    
    await saveState({
      ...state,
      accounts: updatedAccounts,
      balance: newGlobalBalance,
    });
  };

  const handleResetApp = async () => {
    if (!confirm('¿Seguro que quieres reiniciar todos los datos y dejar la aplicación como el primer día? Se borrará todo el historial.')) return;
    
    await saveState({
      transactions: [],
      accounts: [],
      investments: [],
      soldInvestments: [],
      annualBudget: 0,
      balance: 0,
      budgetStartMonth: ''
    });

    window.location.reload();
  };

  return (
    <div className="flex flex-col space-y-4 pb-10">
      
      {/* Tarjeta de Patrimonio Total */}
      <div 
        onClick={openCreateModal}
        className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-4 cursor-pointer hover:border-[var(--gold)] transition-colors shadow-sm"
      >
        <p className="text-[11px] text-[var(--text-soft)] m-0 mb-1 font-medium uppercase tracking-wider">Patrimonio Total</p>
        <p className="text-[28px] font-semibold text-[var(--gold)] m-0">
          {fmt(totalBalance)}
        </p>
        <p className="text-[10px] text-[var(--text-soft)] m-0 mt-2">Haz clic para crear una nueva cuenta</p>
      </div>

      <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-4 shadow-sm">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-[11px] text-[var(--text-soft)] m-0 mb-1 font-medium uppercase tracking-wider">
              Presupuesto de {monthName}
            </p>
            <p className={`text-[20px] font-semibold m-0 ${isOverBudget ? 'text-[var(--coral)]' : 'text-[var(--ink)]'}`}>
              {isOverBudget ? `-${fmt(Math.abs(remainingBudget))}` : fmt(remainingBudget)} 
              <span className="text-[12px] font-normal text-[var(--text-soft)] ml-1.5">
                {isOverBudget ? 'excedidos' : 'disponibles'}
              </span>
            </p>
          </div>
          <div className="text-right flex flex-col gap-2">
            <div>
              <p className="text-[10px] text-[var(--text-soft)] m-0 mb-0.5">Ingresado</p>
              <p className="text-[13px] font-medium text-[var(--teal-d)] m-0">
                +{fmt(currentMonthIncome)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-soft)] m-0 mb-0.5">Gastado</p>
              <p className={`text-[13px] font-medium m-0 ${isOverBudget ? 'text-[var(--coral)]' : 'text-[var(--ink)]'}`}>
                {fmt(currentMonthExpense)} <span className="text-[11px] text-[var(--text-soft)]">/ {fmt(effectiveMonthlyBudget)}</span>
              </p>
            </div>
          </div>
        </div>
        
        <div className="w-full h-1.5 bg-[#2A2A38] rounded-full overflow-hidden relative mt-1">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? 'bg-[var(--coral)]' : 'bg-[var(--teal-d)]'}`}
            style={{ width: `${spentPct}%` }}
          ></div>
        </div>
      </div>

      {/* Lista de Cuentas */}
      <div>
        <div className="flex justify-between items-center mb-2.5">
          <h3 className="font-['Playfair_Display'] text-[16px] font-semibold m-0 text-[var(--ink)]">
            Tus Cuentas
          </h3>
          <button 
            onClick={openCreateModal}
            className="text-[11px] text-[var(--gold)] hover:underline bg-transparent border-none cursor-pointer p-0"
          >
            Gestionar cuentas
          </button>
        </div>
        {accounts.length === 0 ? (
          <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-5 text-center text-[var(--text-soft)] text-[12px]">
            No tienes cuentas creadas. Pulsa el recuadro superior para añadir una.
          </div>
        ) : (
          <div className="space-y-2">
            {accounts.map((acc: any) => (
              <div key={acc.id} className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-3.5 flex justify-between items-center shadow-sm group">
                
                <div>
                  <p className="font-semibold text-[13px] text-[var(--ink)] m-0">{acc.name}</p>
                  <p className="text-[10px] text-[var(--text-soft)] m-0 mt-0.5">
                    {acc.type === 'cash' 
                       ? `Efectivo${acc.excludeFromTotal ? ' • Oculto del total' : ''}`
                       : getAccountTypeLabel(acc.purpose || acc.type)
                    }
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => openEditModal(acc)}
                      className="text-[11px] font-medium text-[var(--text-soft)] hover:text-[var(--gold)] bg-transparent border-none cursor-pointer px-1.5 py-1 transition-colors"
                      title="Editar cuenta"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => handleDeleteAccount(acc.id)}
                      className="text-[16px] text-[var(--text-soft)] hover:text-[var(--coral)] bg-transparent border-none cursor-pointer px-1.5 py-0.5 transition-colors leading-none"
                      title="Eliminar cuenta"
                    >
                      ×
                    </button>
                  </div>
                  
                  <p className={`text-[14px] font-semibold m-0 min-w-[70px] text-right ${acc.excludeFromTotal ? 'text-[var(--text-soft)] opacity-80' : 'text-[var(--ink)]'}`}>
                    {fmt(acc.balance)}
                  </p>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-2 text-center">
        <button 
          onClick={handleResetApp}
          className="text-[11px] text-[var(--text-soft)] hover:text-[var(--coral)] bg-transparent border border-[var(--paper-line)] rounded-[8px] py-2 px-4 cursor-pointer transition-colors"
        >
          Reiniciar aplicación por completo
        </button>
      </div>

      {/* ARREGLO: Ahora el Modal recibe correctamente la cuenta que hayas mandado editar */}
      <BalanceModal 
        isOpen={isBalanceModalOpen} 
        onClose={() => { setIsBalanceModalOpen(false); setEditingAccount(null); }} 
        accountToEdit={editingAccount} 
      />
      
    </div>
  );
}