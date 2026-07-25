'use client';

import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import BalanceModal from '../components/BalanceModal';

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
  const transactions = state.transactions || [];
  const totalBalance = accounts.reduce((sum: number, acc: any) => sum + Number(acc.balance || 0), 0);

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

  return (
    <div className="flex flex-col space-y-4">
      
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

      <div>
        <h3 className="font-['Playfair_Display'] text-[16px] font-semibold m-0 mb-2.5 text-[var(--ink)]">
          Tus Cuentas
        </h3>
        {accounts.length === 0 ? (
          <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-5 text-center text-[var(--text-soft)] text-[12px]">
            No tienes cuentas creadas. Pulsa el botón de abajo para añadir una.
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
                  {/* Botones sutiles alineados a la izquierda del saldo */}
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
                  
                  {/* Saldo a la derecha del todo */}
                  <p className="text-[14px] font-semibold text-[var(--ink)] m-0 min-w-[70px] text-right">
                    {fmt(acc.balance)}
                  </p>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-['Playfair_Display'] text-[16px] font-semibold m-0 mb-2.5 text-[var(--ink)]">
          Actividad Reciente
        </h3>
        {transactions.length === 0 ? (
          <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-5 text-center text-[var(--text-soft)] text-[12px]">
            Sin movimientos recientes.
          </div>
        ) : (
          <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-3.5 space-y-3">
            {transactions.slice(0, 5).map((t: any) => {
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

      {/* Modal para Crear Cuenta nueva */}
      <BalanceModal isOpen={isBalanceModalOpen} onClose={() => setIsBalanceModalOpen(false)} />
      
      {/* Modal para Editar una Cuenta existente */}
      <BalanceModal isOpen={!!editingAccount} onClose={() => setEditingAccount(null)} accountToEdit={editingAccount} />
    </div>
  );
}