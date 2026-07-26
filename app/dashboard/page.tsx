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

const getAccountTypeLabel = (type: string) => {
  if (type === 'ahorro') return 'Ahorro';
  if (type === 'ambas') return 'Día a día y Ahorro';
  return 'Día a día';
};

export default function ResumenPage() {
  const { state, saveState } = useAppContext();
  
  // Modal para crear nueva cuenta desde el recuadro superior
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  
  // Modal para editar cuenta en concreto
  const [editingAccount, setEditingAccount] = useState<any>(null);

  const accounts = state.accounts || [];
  const totalBalance = accounts.reduce((sum: number, acc: any) => sum + Number(acc.balance || 0), 0);

  // === ORDENAR ACTIVIDAD RECIENTE POR FECHA (MÁS RECIENTE PRIMERO) ===
  const sortedTransactions = useMemo(() => {
    return [...(state.transactions || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [state.transactions]);

  // === LÓGICA DEL PRESUPUESTO DEL MES ACTUAL ===
  const { currentMonthExpense, currentMonthIncome, remainingBudget, effectiveMonthlyBudget, spentPct, monthName, isOverBudget } = useMemo(() => {
    const d = new Date();
    const currentMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const mName = MONTH_NAMES[d.getMonth()];

    // Presupuesto base mensual
    const annualBudget = Number(state.annualBudget || 0);
    const baseMonthly = annualBudget / 12;

    let expense = 0;
    let splitIncome = 0;
    let regularIncome = 0;

    (state.transactions || []).forEach((t: any) => {
      const tKey = (t.date && t.date.length >= 7) ? t.date.slice(0, 7) : '';

      // Mirar si hay algún ingreso repartido que aplique a este mes
      if (t.split && Array.isArray(t.splitDetail)) {
        const entry = t.splitDetail.find((detail: any) => detail.key === currentMonthKey);
        if (entry && t.type === 'income') {
          splitIncome += entry.amount;
        }
      } else if (tKey === currentMonthKey && t.type === 'income') {
        // Ingreso normal (no repartido) de este mes
        regularIncome += Number(t.amount || 0);
      }

      // Sumar los gastos de este mes
      if (tKey === currentMonthKey && t.type === 'expense') {
        expense += Math.abs(Number(t.amount || 0));
      }
    });

    const currentIncome = regularIncome + splitIncome;
    const effective = baseMonthly + splitIncome;
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
  // =============================================

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('¿Seguro que quieres borrar esta cuenta de forma permanente?')) return;
    const updatedAccounts = accounts.filter((acc: any) => acc.id !== id);
    const newGlobalBalance = updatedAccounts.reduce((sum: number, acc: any) => sum + Number(acc.balance || 0), 0);
    
    await saveState({
      ...state,
      accounts: updatedAccounts,
      balance: newGlobalBalance,
    });
  };

  // NUEVO: Botón de emergencia para vaciar la app por completo si se queda algún dato residual
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
        onClick={() => setIsBalanceModalOpen(true)}
        className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-4 cursor-pointer hover:border-[var(--gold)] transition-colors shadow-sm"
      >
        <p className="text-[11px] text-[var(--text-soft)] m-0 mb-1 font-medium uppercase tracking-wider">Patrimonio Total</p>
        <p className="text-[28px] font-semibold text-[var(--gold)] m-0">
          {fmt(totalBalance)}
        </p>
        <p className="text-[10px] text-[var(--text-soft)] m-0 mt-2">Haz clic para crear una nueva cuenta</p>
      </div>

      {/* Tarjeta: Resumen Mensual */}
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
        
        {/* Barra de progreso */}
        <div className="w-full h-1.5 bg-[#2A2A38] rounded-full overflow-hidden relative mt-1">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? 'bg-[var(--coral)]' : 'bg-[var(--teal-d)]'}`}
            style={{ width: `${spentPct}%` }}
          ></div>
        </div>
      </div>

      {/* Lista de Cuentas */}
      <div>
        <h3 className="font-['Playfair_Display'] text-[16px] font-semibold m-0 mb-2.5 text-[var(--ink)]">
          Tus Cuentas
        </h3>
        {accounts.length === 0 ? (
          <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-5 text-center text-[var(--text-soft)] text-[12px]">
            No tienes cuentas creadas. Pulsa el recuadro superior para añadir una.
          </div>
        ) : (
          <div className="space-y-2">
            {accounts.map((acc: any) => (
              <div key={acc.id} className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-3.5 flex justify-between items-center shadow-sm">
                
                <div>
                  <p className="font-semibold text-[13px] text-[var(--ink)] m-0">{acc.name}</p>
                  <p className="text-[10px] text-[var(--text-soft)] m-0 mt-0.5">
                    {getAccountTypeLabel(acc.type)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setEditingAccount(acc)}
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
                  
                  <p className="text-[14px] font-semibold text-[var(--ink)] m-0 min-w-[70px] text-right">
                    {fmt(acc.balance)}
                  </p>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actividad Reciente */}
      <div>
        <h3 className="font-['Playfair_Display'] text-[16px] font-semibold m-0 mb-2.5 text-[var(--ink)]">
          Actividad Reciente
        </h3>
        {sortedTransactions.length === 0 ? (
          <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-5 text-center text-[var(--text-soft)] text-[12px]">
            Sin movimientos recientes.
          </div>
        ) : (
          <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-3.5 space-y-3">
            {sortedTransactions.slice(0, 5).map((t: any) => {
              const isExpense = t.type === 'expense' || Number(t.amount || 0) < 0;
              const absAmount = Math.abs(Number(t.amount || 0));
              return (
                <div key={t.id} className="flex justify-between items-center border-b border-[var(--paper-line)] last:border-b-0 pb-2.5 last:pb-0">
                  <div>
                    <p className="text-[13px] font-medium text-[var(--ink)] m-0 mb-0.5">{t.title || t.category}</p>
                    <p className="text-[10px] text-[var(--text-soft)] m-0">{t.date}</p>
                  </div>
                  <p className={`text-[13px] font-medium m-0 ${isExpense ? 'text-[var(--coral)]' : 'text-[var(--teal-d)]'}`}>
                    {isExpense ? '-' : '+'}{fmt(absAmount)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Botón de Limpieza Total / Reset */}
      <div className="pt-2 text-center">
        <button 
          onClick={handleResetApp}
          className="text-[11px] text-[var(--text-soft)] hover:text-[var(--coral)] bg-transparent border border-[var(--paper-line)] rounded-[8px] py-2 px-4 cursor-pointer transition-colors"
        >
          Reiniciar aplicación por completo (Limpiar todo)
        </button>
      </div>

      {/* Modal para Crear Cuenta nueva */}
      <BalanceModal isOpen={isBalanceModalOpen} onClose={() => setIsBalanceModalOpen(false)} />
      
      {/* Modal para Editar una Cuenta existente */}
      <BalanceModal isOpen={!!editingAccount} onClose={() => setEditingAccount(null)} accountToEdit={editingAccount} />
    </div>
  );
}