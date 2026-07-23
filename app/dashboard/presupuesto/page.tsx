'use client';

import { useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import BudgetModal from '../../components/BudgetModal';

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const fmt = (n: number) => {
  const v = Number(n) || 0;
  return v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
};

export default function PresupuestoPage() {
  const { state } = useAppContext();
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  const { budgetMonths, totalEffectiveYear, totalSplitIncome } = useMemo(() => {
    const annual = Number(state.annualBudget || 0);
    const monthly = annual / 12;
    
    let startKey = state.budgetStartMonth;
    if (!startKey) {
      const d = new Date();
      startKey = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0');
    }

    let [y, m] = startKey.split('-').map(Number);
    let generatedMonths = [];
    let tSplitIncome = 0;

    for (let i = 0; i < 12; i++) {
      let date = new Date(y, m - 1 + i, 1);
      let key = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, '0');
      let name = MONTHS[date.getMonth()] + " " + String(date.getFullYear()).slice(-2);
      
      let income = 0;
      let expense = 0;

      (state.transactions || []).forEach((t: any) => {
        if (t.split && Array.isArray(t.splitDetail)) {
          const entry = t.splitDetail.find((d: any) => d.key === key);
          if (entry) {
            if (t.type === 'income') income += entry.amount;
            else expense += entry.amount;
          }
          return;
        }
        
        const tKey = (t.date && t.date.length >= 7) ? t.date.slice(0, 7) : 'sin-fecha';
        if (tKey === key) {
          if (t.type === 'expense') {
            expense += t.amount;
          }
        }
      });

      tSplitIncome += income;
      const effectiveBudget = monthly + income;
      const pct = effectiveBudget > 0 ? Math.min(100, (expense / effectiveBudget) * 100) : 0;
      const over = effectiveBudget > 0 && expense > effectiveBudget;

      generatedMonths.push({
        key,
        name,
        expense,
        effectiveBudget,
        pct,
        over
      });
    }

    return {
      budgetMonths: generatedMonths,
      totalEffectiveYear: annual + tSplitIncome,
      totalSplitIncome: tSplitIncome
    };
  }, [state]);

  return (
    <div className="relative min-h-full pb-16">
      <h2 className="font-['Playfair_Display'] text-[20px] font-semibold m-0 mb-1.5 text-[var(--ink)] tracking-wide">
        Presupuesto móvil (12 meses)
      </h2>
      <p className="text-[13px] text-[var(--text-soft)] m-0 mb-5 leading-relaxed">
        Tu año empieza cuando tú decidas. Repartimos tu presupuesto global entre 12 meses.
      </p>

      {/* Tarjeta de Presupuesto Global */}
      <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-4 mb-4">
        <p className="text-[12px] text-[var(--text-soft)] m-0 mb-1.5 font-medium">Presupuesto total efectivo (12 meses)</p>
        <p 
          className="font-['IBM_Plex_Mono'] text-[28px] font-medium text-[var(--gold)] cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setIsBudgetModalOpen(true)}
        >
          {fmt(totalEffectiveYear)}
        </p>
        <p className="text-[12px] text-[var(--text-soft)] m-0 mt-2 font-medium">
          Media: {fmt(totalEffectiveYear / 12)} al mes
        </p>

        {totalSplitIncome > 0 && (
          <>
            <div className="flex justify-between text-[13px] text-[var(--text-soft)] mt-3 pt-3 border-t border-dashed border-[var(--paper-line)]">
              <span>Base configurada:</span>
              <span className="font-['IBM_Plex_Mono']">{fmt(state.annualBudget)}</span>
            </div>
            <div className="flex justify-between text-[13px] text-[var(--teal-d)] mt-1.5">
              <span>Ingresos repartidos:</span>
              <span className="font-['IBM_Plex_Mono']">+{fmt(totalSplitIncome)}</span>
            </div>
          </>
        )}
      </div>

      <button 
        className="w-full mb-6 bg-[var(--gold)] text-[#0D0D12] font-semibold text-[14px] p-3 rounded-[10px] border-none cursor-pointer active:scale-95 transition-transform"
        onClick={() => setIsBudgetModalOpen(true)}
      >
        Editar presupuesto anual base y fechas
      </button>

      {/* Lista de Barras de Progreso Mensual */}
      <h2 className="font-['Playfair_Display'] text-[20px] font-semibold m-0 mb-1.5 text-[var(--ink)] tracking-wide">
        Gasto real por mes
      </h2>
      <p className="text-[13px] text-[var(--text-soft)] m-0 mb-4 leading-relaxed">
        Barra verde = dentro de lo previsto. Barra roja = te has pasado ese mes.
      </p>

      <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-4 pr-2">
        <div className="max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
          {budgetMonths.map((m) => (
            <div key={m.key} className="flex items-center gap-3 py-2.5 border-b border-[var(--paper-line)] last:border-b-0">
              <div className="font-['Playfair_Display'] text-[14px] w-[55px] shrink-0 text-[var(--ink)]">
                {m.name}
              </div>
              <div className="flex-1 h-1.5 bg-[#2A2A38] rounded-full overflow-hidden relative">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${m.over ? 'bg-[var(--coral)]' : 'bg-[var(--teal-d)]'}`}
                  style={{ width: `${m.pct}%` }}
                ></div>
              </div>
              <div className="font-['IBM_Plex_Mono'] text-[11px] text-[var(--text-soft)] w-[96px] text-right shrink-0">
                {fmt(m.expense)} / {fmt(m.effectiveBudget)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal inyectado */}
      <BudgetModal isOpen={isBudgetModalOpen} onClose={() => setIsBudgetModalOpen(false)} />
    </div>
  );
}