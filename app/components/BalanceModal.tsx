'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

export default function BalanceModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { state, saveState } = useAppContext();
  
  const accounts = state.accounts || [];
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [balance, setBalance] = useState('');

  // Cuando se abre el modal, por defecto seleccionamos la primera cuenta
  useEffect(() => {
    if (isOpen && accounts.length > 0) {
      const firstAccId = accounts[0].id;
      setSelectedAccountId(firstAccId);
      setBalance(accounts[0].balance?.toString() || '0');
    }
  }, [isOpen, accounts]);

  // Si el usuario cambia de cuenta en el desplegable, actualizamos el número que se ve
  const handleAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedAccountId(newId);
    const acc = accounts.find((a: any) => a.id === newId);
    setBalance(acc?.balance?.toString() || '0');
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    const val = parseFloat(balance) || 0;
    
    // Actualizamos únicamente la cuenta que el usuario ha seleccionado
    const updatedAccounts = accounts.map((acc: any) => {
      if (acc.id === selectedAccountId) {
        return { ...acc, balance: val };
      }
      return acc;
    });

    const newState = { ...state, accounts: updatedAccounts };
    
    // Sincronizamos el total general
    newState.balance = updatedAccounts.reduce((sum: number, acc: any) => sum + Number(acc.balance || 0), 0);

    const ok = await saveState(newState);
    if (ok) onClose();
  };

  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-[4px] z-[100] flex items-end justify-center" onClick={onClose}>
      <div 
        className="bg-[var(--paper)] w-full rounded-t-[24px] p-6 pb-8 border-t border-[var(--paper-line)] animate-[fade_0.3s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-['Playfair_Display'] text-[19px] m-0 text-[var(--ink)]">Ajustar saldo manual</h3>
          <button onClick={onClose} className="text-[24px] leading-none text-[var(--text-soft)] bg-transparent border-none cursor-pointer p-1">×</button>
        </div>
        
        {accounts.length > 0 ? (
          <>
            <div className="mb-4">
              <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">¿De qué cuenta?</label>
              <select 
                value={selectedAccountId} 
                onChange={handleAccountChange} 
                className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)] cursor-pointer"
              >
                {accounts.map((acc: any) => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">Saldo real (€)</label>
              <input 
                type="number" step="any" 
                value={balance} 
                onChange={(e) => setBalance(e.target.value)}
                className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)]"
              />
            </div>

            <button 
              onClick={handleSave}
              className="w-full bg-[var(--gold)] text-[#0D0D12] font-semibold text-[14px] p-3 rounded-[10px] border-none cursor-pointer active:scale-95 transition-transform"
            >
              Guardar saldo
            </button>
          </>
        ) : (
          <p className="text-[13px] text-[var(--text-soft)]">No tienes cuentas creadas para ajustar el saldo.</p>
        )}
      </div>
    </div>
  );
}