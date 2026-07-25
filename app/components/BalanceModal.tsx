'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

export default function BalanceModal({ isOpen, onClose, accountToEdit }: { isOpen: boolean; onClose: () => void, accountToEdit?: any }) {
  const { state, saveState } = useAppContext();
  const accounts = state.accounts || [];

  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [accountType, setAccountType] = useState<'dia_a_dia' | 'ahorro' | 'ambas'>('dia_a_dia');

  // Si abrimos el modal para editar, rellenamos los datos
  useEffect(() => {
    if (isOpen) {
      if (accountToEdit) {
        setName(accountToEdit.name || '');
        setBalance(accountToEdit.balance?.toString() || '0');
        setAccountType(accountToEdit.type || 'dia_a_dia');
      } else {
        setName('');
        setBalance('');
        setAccountType('dia_a_dia');
      }
    }
  }, [isOpen, accountToEdit]);

  if (!isOpen) return null;

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let updatedAccounts;

    if (accountToEdit) {
      // Editar cuenta existente
      updatedAccounts = accounts.map((acc: any) => 
        acc.id === accountToEdit.id 
          ? { ...acc, name: name.trim(), balance: Number(balance) || 0, type: accountType }
          : acc
      );
    } else {
      // Crear cuenta nueva
      const newAccount = {
        id: Date.now().toString(),
        name: name.trim(),
        balance: Number(balance) || 0,
        type: accountType,
      };
      updatedAccounts = [...accounts, newAccount];
    }

    const newGlobalBalance = updatedAccounts.reduce((sum: number, acc: any) => sum + Number(acc.balance || 0), 0);

    const newState = {
      ...state,
      accounts: updatedAccounts,
      balance: newGlobalBalance,
    };

    await saveState(newState);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[340px] bg-[var(--paper)] border border-[var(--paper-line)] rounded-[20px] p-5 shadow-2xl flex flex-col space-y-4">
        
        <div className="flex justify-between items-center border-b border-[var(--paper-line)] pb-2">
          <h3 className="font-['Playfair_Display'] text-[16px] font-semibold text-[var(--ink)] m-0">
            {accountToEdit ? 'Editar Cuenta' : 'Nueva Cuenta'}
          </h3>
          <button 
            type="button"
            onClick={onClose}
            className="bg-transparent border-none text-[var(--text-soft)] text-[16px] cursor-pointer hover:text-[var(--coral)]"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSaveAccount} className="flex flex-col space-y-3 pt-1">
          <div>
            <label className="block text-[11px] text-[var(--text-soft)] mb-1">Nombre de la cuenta / Banco</label>
            <input 
              type="text"
              required
              placeholder="Ej: BBVA, Revolut, Efectivo..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[12px] outline-none focus:border-[var(--gold)]"
            />
          </div>

          <div>
            <label className="block text-[11px] text-[var(--text-soft)] mb-1">Saldo (€)</label>
            <input 
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="w-full p-2.5 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[12px] outline-none focus:border-[var(--gold)]"
            />
          </div>

          <div>
            <label className="block text-[11px] text-[var(--text-soft)] mb-1">Tipo de cuenta</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setAccountType('dia_a_dia')}
                className={`py-2 px-1 text-[11px] rounded-[8px] border cursor-pointer font-medium transition-all ${accountType === 'dia_a_dia' ? 'bg-[var(--gold)] text-[#0D0D12] border-[var(--gold)]' : 'bg-[var(--paper-2)] text-[var(--text-soft)] border-[var(--paper-line)]'}`}
              >
                Día a día
              </button>
              <button
                type="button"
                onClick={() => setAccountType('ahorro')}
                className={`py-2 px-1 text-[11px] rounded-[8px] border cursor-pointer font-medium transition-all ${accountType === 'ahorro' ? 'bg-[var(--gold)] text-[#0D0D12] border-[var(--gold)]' : 'bg-[var(--paper-2)] text-[var(--text-soft)] border-[var(--paper-line)]'}`}
              >
                Ahorro
              </button>
              <button
                type="button"
                onClick={() => setAccountType('ambas')}
                className={`py-2 px-1 text-[11px] rounded-[8px] border cursor-pointer font-medium transition-all ${accountType === 'ambas' ? 'bg-[var(--gold)] text-[#0D0D12] border-[var(--gold)]' : 'bg-[var(--paper-2)] text-[var(--text-soft)] border-[var(--paper-line)]'}`}
              >
                Ambas
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="w-full py-2.5 bg-[var(--paper-2)] border border-[var(--paper-line)] text-[var(--ink)] font-semibold text-[12px] rounded-[10px] cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="w-full py-2.5 bg-[var(--gold)] text-[#0D0D12] font-semibold text-[12px] rounded-[10px] border-none cursor-pointer hover:opacity-95 transition-opacity"
            >
              {accountToEdit ? 'Guardar' : 'Añadir'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}