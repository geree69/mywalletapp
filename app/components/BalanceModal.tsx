'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

export default function BalanceModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { state, saveState } = useAppContext();
  const [balance, setBalance] = useState('');

  // Cuando se abre el modal, ponemos el saldo actual en la cajita
  useEffect(() => {
    if (isOpen) {
      setBalance(state.balance?.toString() || '0');
    }
  }, [isOpen, state.balance]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const val = parseFloat(balance) || 0;
    
    // Hacemos una copia del estado actual
    const newState = { ...state };
    newState.balance = val;

    // Si las cuentas están fusionadas, el ahorro y el saldo son lo mismo
    if (newState.mergeAccounts && newState.savings) {
      newState.savings.amount = val;
    }

    // Guardamos en Firebase y cerramos
    const ok = await saveState(newState);
    if (ok) onClose();
  };

  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-[4px] z-[100] flex items-end justify-center" onClick={onClose}>
      <div 
        className="bg-[var(--paper)] w-full rounded-t-[24px] p-6 pb-8 border-t border-[var(--paper-line)] animate-[fade_0.3s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-['Playfair_Display'] text-[19px] m-0 mb-5 text-[var(--ink)]">Ajustar saldo en cuenta</h3>
        
        <div className="mb-6">
          <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">Saldo total disponible (€)</label>
          <input 
            type="number" step="0.01" 
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
      </div>
    </div>
  );
}