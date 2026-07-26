'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

export default function BudgetModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { state, saveState } = useAppContext();
  
  const [annual, setAnnual] = useState('');
  const [startMonth, setStartMonth] = useState('');

  // Rellenar el formulario automáticamente cuando se abre
  useEffect(() => {
    if (isOpen) {
      setAnnual(state.annualBudget?.toString() || '');
      
      if (state.budgetStartMonth) {
        setStartMonth(state.budgetStartMonth);
      } else {
        // Si no hay mes configurado, usar el actual por defecto
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        setStartMonth(`${yyyy}-${mm}`);
      }
    }
  }, [isOpen, state.annualBudget, state.budgetStartMonth]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await saveState({
      ...state,
      annualBudget: Number(annual) || 0,
      budgetStartMonth: startMonth,
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[340px] bg-[var(--paper)] border border-[var(--paper-line)] rounded-[20px] p-5 shadow-2xl flex flex-col space-y-4">
        
        <div className="flex justify-between items-center border-b border-[var(--paper-line)] pb-2">
          <h3 className="font-['Playfair_Display'] text-[16px] font-semibold text-[var(--ink)] m-0">
            Presupuesto Anual Base
          </h3>
          <button 
            type="button"
            onClick={onClose}
            className="bg-transparent border-none text-[var(--text-soft)] text-[16px] cursor-pointer hover:text-[var(--coral)]"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col space-y-3 pt-1">
          <div>
            <label className="block text-[11px] text-[var(--text-soft)] mb-1">Presupuesto total del año (€)</label>
            <input 
              type="number"
              step="0.01"
              required
              placeholder="Ej. 12000"
              value={annual}
              onChange={(e) => setAnnual(e.target.value)}
              className="w-full p-2.5 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[12px] outline-none focus:border-[var(--gold)]"
            />
          </div>

          <div>
            <label className="block text-[11px] text-[var(--text-soft)] mb-1">Mes en el que empieza tu año</label>
            <input 
              type="month"
              required
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              className="w-full p-2.5 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[12px] outline-none focus:border-[var(--gold)]"
            />
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
              Guardar
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}