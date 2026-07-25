'use client';

import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import TransactionModal from '../../components/TransactionModal';

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const fmt = (n: number) => (Number(n) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

// EL MOTOR DEL TIEMPO
const expandTxs = (txs: any[]) => {
  const expanded: any[] = [];
  const todayStr = new Date().toISOString().split('T')[0];

  txs.forEach((t) => {
    if (!t.isRecurring) {
      if ((t.date || '') <= todayStr) {
        expanded.push(t);
      }
    } else {
      const [tY, tM, tD] = (t.date || '').split('-').map(Number);
      if (!tY) { expanded.push(t); return; }

      let currY = tY;
      let currM = tM;

      while (true) {
        const instanceDate = `${currY}-${String(currM).padStart(2, '0')}-${String(tD).padStart(2, '0')}`;
        if (instanceDate > todayStr) break; 
        
        expanded.push({
          ...t,
          id: currY === tY && currM === tM ? t.id : `${t.id}-${currY}-${currM}`,
          originalId: t.id,
          date: instanceDate
        });
        
        currM++;
        if (currM > 12) { currM = 1; currY++; }
      }
    }
  });
  return expanded;
};

export default function MovimientosPage() {
  const { state, saveState } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});

  const accounts = state.accounts || [];

  const rawTxs = (state.transactions || []).map((t: any) => ({
    ...t,
    accountId: t.accountId || (accounts.length > 0 ? accounts[0].id : '')
  }));

  const todasLasTxs = expandTxs(rawTxs);

  const filteredTxs = todasLasTxs.filter((t: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const categoryMatch = (t.category || '').toLowerCase().includes(q);
    const titleMatch = (t.title || '').toLowerCase().includes(q);
    return categoryMatch || titleMatch;
  });

  const movimientosOrdenados = [...filteredTxs].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const groupedByMonth: { [key: string]: any[] } = {};
  movimientosOrdenados.forEach((t) => {
    const monthKey = (t.date || '').slice(0, 7);
    if (!monthKey) return;
    if (!groupedByMonth[monthKey]) {
      groupedByMonth[monthKey] = [];
    }
    groupedByMonth[monthKey].push(t);
  });

  const sortedMonths = Object.keys(groupedByMonth).sort((a, b) => b.localeCompare(a));

  const toggleMonth = (monthKey: string) => {
    setOpenMonths(prev => ({
      ...prev,
      [monthKey]: prev[monthKey] === undefined ? false : !prev[monthKey]
    }));
  };

  const handleDeleteTx = async (tx: any) => {
    if (!confirm(`¿Seguro que quieres borrar "${tx.title || tx.category}"?`)) return;
    const newState = { ...state };
    
    const idToDelete = tx.originalId || tx.id;
    
    // Devolvemos el dinero exacto a la cuenta real
    const isExpense = tx.type === 'expense' || Number(tx.amount || 0) < 0;
    const absAmount = Math.abs(Number(tx.amount || 0));
    const amountToRestore = isExpense ? absAmount : -absAmount;

    let updatedAccounts = [...accounts];
    if (tx.accountId) {
      updatedAccounts = updatedAccounts.map((acc: any) => {
        if (acc.id === tx.accountId) {
          return { ...acc, balance: Number(acc.balance || 0) + amountToRestore };
        }
        return acc;
      });
    }

    newState.accounts = updatedAccounts;
    newState.transactions = (state.transactions || []).filter((t: any) => t.id !== idToDelete);
    newState.balance = updatedAccounts.reduce((sum: number, acc: any) => sum + Number(acc.balance || 0), 0);

    await saveState(newState);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-h-[680px] relative overflow-hidden">
      
      {/* CABECERA */}
      <div className="shrink-0 mb-4">
        <h2 className="font-['Playfair_Display'] text-[20px] font-semibold m-0 mb-1 text-[var(--ink)] tracking-wide">
          Todos los Movimientos
        </h2>
        <p className="text-[12px] text-[var(--text-soft)] m-0 mb-3 leading-relaxed">
          Historial ordenado por meses y filtrable por categoría.
        </p>

        {/* BARRA DE BÚSQUEDA */}
        <input 
          type="text"
          placeholder="Buscar por categoría o concepto..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-2.5 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[13px] outline-none focus:border-[var(--gold)]"
        />
      </div>

      {/* ZONA DE DESPLAZAMIENTO */}
      <div className="flex-1 overflow-y-auto pr-1 pb-16 space-y-3">
        {sortedMonths.length > 0 ? (
          sortedMonths.map((monthKey, index) => {
            const [year, month] = monthKey.split('-');
            const monthName = MONTH_NAMES[parseInt(month, 10) - 1] || month;
            const txsInMonth = groupedByMonth[monthKey];

            const isOpen = searchQuery.trim() ? true : (openMonths[monthKey] !== undefined ? openMonths[monthKey] : index === 0);
            
            // CÁLCULO MES: Matemáticas reales sin duplicar signos
            const totalMonth = txsInMonth.reduce((acc, t) => {
              const isExpense = t.type === 'expense' || Number(t.amount || 0) < 0;
              const absVal = Math.abs(Number(t.amount || 0));
              return acc + (isExpense ? -absVal : absVal);
            }, 0);

            return (
              <div key={monthKey} className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] overflow-hidden shadow-sm">
                
                <div 
                  onClick={() => toggleMonth(monthKey)}
                  className="p-3.5 flex justify-between items-center cursor-pointer select-none hover:bg-[rgba(244,197,99,0.05)] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-['Playfair_Display'] text-[15px] font-semibold text-[var(--ink)] capitalize">
                      {monthName} {year}
                    </span>
                    <span className="text-[10px] text-[var(--text-soft)] bg-[var(--paper)] border border-[var(--paper-line)] px-2 py-0.5 rounded-[6px]">
                      {txsInMonth.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`font-['IBM_Plex_Mono'] text-[13px] font-medium ${totalMonth >= 0 ? 'text-[var(--teal-d)]' : 'text-[var(--coral)]'}`}>
                      {totalMonth >= 0 ? '+' : ''}{fmt(totalMonth)}
                    </span>
                    <span className={`text-[10px] text-[var(--text-soft)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </div>
                </div>

                {isOpen && (
                  <div className="px-3.5 pb-3 pt-1 border-t border-[var(--paper-line)] bg-[var(--paper)]">
                    {txsInMonth.map((t: any) => {
                      const isExpense = t.type === 'expense' || Number(t.amount || 0) < 0;
                      const absAmount = Math.abs(Number(t.amount || 0));

                      return (
                        <div key={t.id} className="flex justify-between items-center py-2.5 border-b border-[var(--paper-line)] last:border-b-0 last:pb-0 first:pt-1">
                          <div>
                            <p className="text-[13px] font-medium text-[var(--ink)] m-0 mb-0.5">
                              {t.title || t.category}
                              {t.isRecurring && <span className="text-[var(--gold)] text-[9px] font-semibold border border-[var(--gold-l)] bg-[var(--gold-l)] px-1.5 py-0.2 rounded-[4px] ml-2 align-middle">Recurrente</span>}
                            </p>
                            <p className="text-[10px] text-[var(--text-soft)] m-0">
                              {t.category} . {t.date} 
                              {accounts.length > 1 && t.accountId && <span className="ml-1 text-[var(--gold)] opacity-80">({accounts.find((a:any)=>a.id===t.accountId)?.name || ''})</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className={`font-['IBM_Plex_Mono'] text-[14px] font-medium ${isExpense ? 'text-[var(--coral)]' : 'text-[var(--teal-d)]'}`}>
                              {isExpense ? '-' : '+'}{fmt(absAmount)}
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteTx(t); }} 
                              className="text-[18px] text-[var(--text-soft)] hover:text-[var(--coral)] bg-transparent border-none p-1 cursor-pointer transition-colors leading-none" 
                              title="Borrar movimiento"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-6 text-center text-[var(--text-soft)] text-[13px]">
            No se encontraron movimientos con ese filtro.
          </div>
        )}
      </div>

      {/* BOTÓN FLOTANTE */}
      <div className="absolute bottom-3 right-3 z-50">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-12 h-12 bg-[var(--gold)] text-[#0D0D12] rounded-full flex items-center justify-center text-[28px] font-light shadow-[0_4px_12px_rgba(244,197,99,0.5)] active:scale-90 transition-transform cursor-pointer border-none"
        >
          +
        </button>
      </div>

      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}