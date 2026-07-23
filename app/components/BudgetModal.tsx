'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

export default function BudgetModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { state, saveState } = useAppContext();
  const [annualBudget, setAnnualBudget] = useState('');
  const [budgetStartMonth, setBudgetStartMonth] = useState('');

  // Rellenar con los datos actuales al abrir
  useEffect(() => {
    if (isOpen) {
      setAnnualBudget(state.annualBudget?.toString() || '0');
      
      // Si no hay mes guardado, ponemos el actual en formato YYYY-MM
      const currentDefault = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
      setBudgetStartMonth(state.budgetStartMonth || currentDefault);
    }
  }, [isOpen, state.annualBudget, state.budgetStartMonth]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const numBudget = parseFloat(annualBudget) || 0;

    const newState = { 
      ...state, 
      annualBudget: numBudget,
      budgetStartMonth: budgetStartMonth
    };

    const ok = await saveState(newState);
    if (ok) onClose();
  };

  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-[4px] z-[100] flex items-end justify-center" onClick={onClose}>
      <div 
        className="bg-[var(--paper)] w-full rounded-t-[24px] p-6 pb-8 border-t border-[var(--paper-line)] animate-[fade_0.3s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-['Playfair_Display'] text-[19px] m-0 mb-5 text-[var(--ink)]">Configurar presupuesto anual</h3>
        
        <div className="mb-4">
          <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">Presupuesto anual base (€)</label>
          <input 
            type="number" step="0.01" 
            value={annualBudget} 
            onChange={(e) => setAnnualBudget(e.target.value)}
            className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)]"
            placeholder="Ej. 12000"
          />
        </div>

        <div className="mb-6">
          <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">Mes en el que empieza tu año fiscal</label>
          <input 
            type="month" 
            value={budgetStartMonth} 
            onChange={(e) => setBudgetStartMonth(e.target.value)}
            className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)] [color-scheme:dark]"
          />
        </div>

        <button 
          onClick={handleSave}
          className="w-full bg-[var(--gold)] text-[#0D0D12] font-semibold text-[14px] p-3 rounded-[10px] border-none cursor-pointer active:scale-95 transition-transform"
        >
          Guardar configuración
        </button>
      </div>
    </div>
  );
}