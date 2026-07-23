'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

export default function SavingsModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { state, saveState } = useAppContext();
  const [amount, setAmount] = useState('');
  const [tae, setTae] = useState('');
  const [earnedInterest, setEarnedInterest] = useState('');

  useEffect(() => {
    if (isOpen) {
      const sav = state.savings || { amount: 0, tae: 2.25, earnedInterest: 0 };
      setAmount(sav.amount?.toString() || '0');
      setTae(sav.tae?.toString() || '2.25');
      setEarnedInterest(sav.earnedInterest?.toString() || '0');
    }
  }, [isOpen, state.savings]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const numAmount = parseFloat(amount) || 0;
    const numTae = parseFloat(tae) || 0;
    const numEarned = parseFloat(earnedInterest) || 0;

    const newState = { ...state };
    newState.savings = {
      amount: numAmount,
      tae: numTae,
      earnedInterest: numEarned
    };

    if (newState.mergeAccounts) {
      newState.balance = numAmount;
    }

    const ok = await saveState(newState);
    if (ok) onClose();
  };

  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-[4px] z-[100] flex items-end justify-center" onClick={onClose}>
      <div 
        className="bg-[var(--paper)] w-full rounded-t-[24px] p-6 pb-8 border-t border-[var(--paper-line)] animate-[fade_0.3s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-['Playfair_Display'] text-[19px] m-0 mb-5 text-[var(--ink)]">Actualizar cuenta de ahorro</h3>
        
        <div className="mb-4">
          <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">Saldo en cuenta de ahorro (€)</label>
          <input 
            type="number" step="0.01" 
            value={amount} onChange={(e) => setAmount(e.target.value)}
            className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)]"
          />
        </div>

        <div className="mb-4">
          <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">Rendimiento anual (TAE %)</label>
          <input 
            type="number" step="0.01" 
            value={tae} onChange={(e) => setTae(e.target.value)}
            className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)]"
          />
        </div>

        <div className="mb-6">
          <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">Intereses acumulados (€)</label>
          <input 
            type="number" step="0.01" 
            value={earnedInterest} onChange={(e) => setEarnedInterest(e.target.value)}
            className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)]"
          />
        </div>

        <button 
          onClick={handleSave}
          className="w-full bg-[var(--gold)] text-[#0D0D12] font-semibold text-[14px] p-3 rounded-[10px] border-none cursor-pointer active:scale-95 transition-transform"
        >
          Guardar ahorro
        </button>
      </div>
    </div>
  );
}