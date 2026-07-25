'use client';

import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import AddInvestmentModal from '../../components/AddInvestmentModal';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmt = (n: number) => (Number(n) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export default function InversionPage() {
  const { state, saveState } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // ESTADO PARA LOS DESPLEGABLES DE CATEGORÍAS
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  const investments = (state.investments || []).map((inv: any) => ({
    ...inv,
    currentPrice: inv.currentPrice !== undefined && inv.currentPrice !== null && !isNaN(Number(inv.currentPrice)) 
      ? Number(inv.currentPrice) 
      : Number(inv.buyPrice) || 0
  }));

  const totalInvested = investments.reduce((sum: number, inv: any) => sum + (Number(inv.shares) * Number(inv.buyPrice)), 0);
  const totalCurrentValue = investments.reduce((sum: number, inv: any) => sum + (Number(inv.shares) * Number(inv.currentPrice)), 0);
  const totalProfitLoss = totalCurrentValue - totalInvested;
  const totalProfitLossPercent = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

  const handleUpdateCurrentPrice = async (id: string, newCurrentPriceStr: string) => {
    if (newCurrentPriceStr === '') return;
    const newPrice = parseFloat(newCurrentPriceStr.replace(',', '.')) || 0;
    const rawInvestments = state.investments || [];
    const updatedInvestments = rawInvestments.map((inv: any) => 
      inv.id === id ? { ...inv, currentPrice: newPrice } : inv
    );
    await saveState({ ...state, investments: updatedInvestments });
  };

  // VENTA REAL
  const handleSellInvestment = async (id: string) => {
    const rawInvestments = state.investments || [];
    const investmentToSell = rawInvestments.find((inv: any) => inv.id === id);
    if (!investmentToSell) return;

    const input = window.prompt(
      `Vas a VENDER tu inversión en "${investmentToSell.name}".\n\nIntroduce el PRECIO DE VENTA POR UNIDAD:`,
      investmentToSell.currentPrice?.toString() || investmentToSell.buyPrice?.toString()
    );

    if (input === null || input.trim() === '') return;

    const sellPrice = parseFloat(input.replace(',', '.'));
    if (isNaN(sellPrice) || sellPrice < 0) {
      alert("Precio de venta inválido. Operación cancelada.");
      return;
    }
    
    const refundAmount = Number(investmentToSell.shares) * sellPrice;
    
    let updatedAccounts = state.accounts ? [...state.accounts] : [];
    let updatedTransactions = state.transactions ? [...state.transactions] : [];

    if (investmentToSell.accountId) {
      updatedTransactions.push({
        id: uid(),
        title: `Venta inversión: ${investmentToSell.name}`,
        amount: refundAmount,
        accountId: investmentToSell.accountId,
        date: new Date().toISOString().split('T')[0],
        category: 'Venta Inversión',
        type: 'income'
      });

      updatedAccounts = updatedAccounts.map((acc: any) => {
        if (String(acc.id) === String(investmentToSell.accountId)) {
          return { ...acc, balance: Number(acc.balance || 0) + refundAmount };
        }
        return acc;
      });
    }

    const calculatedGlobalBalance = updatedAccounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
    const updatedInvestments = rawInvestments.filter((inv: any) => inv.id !== id);

    await saveState({
      ...state,
      balance: calculatedGlobalBalance,
      investments: updatedInvestments,
      accounts: updatedAccounts,
      transactions: updatedTransactions
    });
  };

  // ELIMINAR POR ERROR
  const handleDeleteMistake = async (id: string) => {
    const rawInvestments = state.investments || [];
    const investmentToDelete = rawInvestments.find((inv: any) => inv.id === id);
    if (!investmentToDelete) return;

    if (!window.confirm(`¿Seguro que quieres eliminar "${investmentToDelete.name}" por error?\n\nSe borrará del historial y el dinero invertido originalmente volverá a tu cuenta.`)) {
      return;
    }

    const refundAmount = Number(investmentToDelete.shares) * Number(investmentToDelete.buyPrice);
    
    let updatedAccounts = state.accounts ? [...state.accounts] : [];
    let updatedTransactions = state.transactions ? [...state.transactions] : [];
    
    updatedTransactions = updatedTransactions.filter((tx: any) => tx.title !== `Inversión: ${investmentToDelete.name}`);

    if (investmentToDelete.accountId) {
      updatedAccounts = updatedAccounts.map((acc: any) => {
        if (String(acc.id) === String(investmentToDelete.accountId)) {
          return { ...acc, balance: Number(acc.balance || 0) + refundAmount };
        }
        return acc;
      });
    }

    const calculatedGlobalBalance = updatedAccounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
    const updatedInvestments = rawInvestments.filter((inv: any) => inv.id !== id);

    await saveState({
      ...state,
      balance: calculatedGlobalBalance,
      investments: updatedInvestments,
      accounts: updatedAccounts,
      transactions: updatedTransactions
    });
  };

  const categories: { [key: string]: any[] } = {};
  investments.forEach((inv: any) => {
    const cat = inv.category || 'Fondos Indexados';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(inv);
  });

  // FUNCIÓN PARA ABRIR/CERRAR DESPLEGABLES
  const toggleCategory = (categoryName: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [categoryName]: prev[categoryName] === undefined ? false : !prev[categoryName]
    }));
  };

  return (
    <div className="flex flex-col pb-24 space-y-4">
      
      <div>
        <h2 className="font-['Playfair_Display'] text-[20px] font-semibold m-0 mb-1 text-[var(--ink)] tracking-wide">
          Inversiones
        </h2>
        <p className="text-[12px] text-[var(--text-soft)] m-0 leading-relaxed">
          Tus activos invertidos y su rendimiento actual.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-3.5">
          <p className="text-[11px] text-[var(--text-soft)] m-0 mb-1 font-medium">Invertido</p>
          <p className="font-['IBM_Plex_Mono'] text-[16px] font-medium text-[var(--ink)]">
            {fmt(totalInvested)}
          </p>
        </div>
        <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-3.5">
          <p className="text-[11px] text-[var(--text-soft)] m-0 mb-1 font-medium">Valor actual</p>
          <p className="font-['IBM_Plex_Mono'] text-[16px] font-medium text-[var(--teal-d)]">
            {fmt(totalCurrentValue)}
          </p>
        </div>
      </div>

      <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-3 text-center">
        <p className="text-[12px] text-[var(--text-soft)] m-0 mb-0.5">Rentabilidad total:</p>
        <p className={`font-['IBM_Plex_Mono'] text-[14px] font-medium ${totalProfitLoss >= 0 ? 'text-[var(--teal-d)]' : 'text-[var(--coral)]'}`}>
          {totalProfitLoss >= 0 ? '+' : ''}{fmt(totalProfitLoss)} ({totalProfitLossPercent >= 0 ? '+' : ''}{totalProfitLossPercent.toFixed(1)}%)
        </p>
      </div>

      {Object.keys(categories).length > 0 ? (
        Object.entries(categories).map(([categoryName, items]) => {
          const catInvested = items.reduce((s, i) => s + (Number(i.shares) * Number(i.buyPrice)), 0);
          const catCurrent = items.reduce((s, i) => s + (Number(i.shares) * Number(i.currentPrice)), 0);
          const catProfit = catCurrent - catInvested;
          const catPercent = catInvested > 0 ? (catProfit / catInvested) * 100 : 0;

          // Por defecto las dejamos abiertas (true). Si el usuario la cierra, pasará a false.
          const isOpen = openCategories[categoryName] !== undefined ? openCategories[categoryName] : true;

          return (
            <div key={categoryName} className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-4 shadow-sm">
              
              {/* CABECERA DEL DESPLEGABLE */}
              <div 
                onClick={() => toggleCategory(categoryName)}
                className="flex justify-between items-center cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[14px] text-[var(--ink)]">{categoryName}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-[4px] font-['IBM_Plex_Mono'] ${catPercent >= 0 ? 'bg-[rgba(45,212,191,0.1)] text-[var(--teal-d)]' : 'bg-[rgba(248,113,113,0.1)] text-[var(--coral)]'}`}>
                    {catPercent >= 0 ? '+' : ''}{catPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-['IBM_Plex_Mono'] text-[14px] font-medium text-[var(--ink)]">{fmt(catCurrent)}</span>
                  <span className={`text-[10px] text-[var(--text-soft)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </div>
              </div>

              {/* CONTENIDO DESPLEGABLE */}
              {isOpen && (
                <div className="space-y-3 mt-4 pt-4 border-t border-[var(--paper-line)]">
                  {items.map((inv: any) => {
                    const investedTotal = Number(inv.shares) * Number(inv.buyPrice);
                    const currentTotal = Number(inv.shares) * Number(inv.currentPrice);
                    const profitLoss = currentTotal - investedTotal;
                    const profitLossPercent = investedTotal > 0 ? (profitLoss / investedTotal) * 100 : 0;

                    return (
                      <div key={inv.id} className="bg-[var(--paper)] border border-[var(--paper-line)] rounded-[8px] p-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[14px] text-[var(--ink)]">{inv.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-[4px] font-['IBM_Plex_Mono'] ${profitLossPercent >= 0 ? 'bg-[rgba(45,212,191,0.1)] text-[var(--teal-d)]' : 'bg-[rgba(248,113,113,0.1)] text-[var(--coral)]'}`}>
                                {profitLossPercent >= 0 ? '+' : ''}{profitLossPercent.toFixed(1)}%
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--text-soft)] m-0 mt-0.5 font-['IBM_Plex_Mono']">
                              {inv.broker ? `Bróker: ${inv.broker} • ` : ''}{inv.date || ''}
                            </p>
                            <p className="text-[11px] text-[var(--text-soft)] m-0 font-['IBM_Plex_Mono']">
                              Invertido: {fmt(investedTotal)} • Compra: {fmt(inv.buyPrice)}/ud
                            </p>
                            <p className="text-[11px] text-[var(--text-soft)] m-0 mt-0.5 font-['IBM_Plex_Mono'] opacity-70">
                              (Tienes {Number(inv.shares).toFixed(6)} ud)
                            </p>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1.5 ml-2">
                            <span className="font-['IBM_Plex_Mono'] text-[14px] font-medium text-[var(--ink)] block text-right">
                              {fmt(currentTotal)}
                            </span>
                            
                            <div className="flex items-center gap-1 mt-1">
                              <button 
                                onClick={() => handleSellInvestment(inv.id)}
                                className="text-[11px] font-semibold text-[var(--teal-d)] hover:bg-[rgba(45,212,191,0.1)] bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[4px] cursor-pointer px-2 py-1 transition-colors"
                                title="Vender inversión y registrar ganancia"
                              >
                                Vender
                              </button>
                              <button 
                                onClick={() => handleDeleteMistake(inv.id)}
                                className="text-[14px] text-[var(--text-soft)] hover:text-[var(--coral)] hover:bg-[rgba(248,113,113,0.1)] bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[4px] cursor-pointer px-2 py-0.5 transition-colors leading-none"
                                title="Eliminar por equivocación"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[var(--paper-line)] gap-2">
                          <span className="text-[11px] text-[var(--text-soft)] font-medium">Precio actual unitario (€):</span>
                          <input 
                            type="number" 
                            step="any"
                            defaultValue={inv.currentPrice} 
                            onBlur={(e) => handleUpdateCurrentPrice(inv.id, e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                            className="w-28 p-1 text-right rounded-[6px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[12px] font-['IBM_Plex_Mono'] outline-none focus:border-[var(--gold)]"
                          />
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
        <div className="text-center py-6 text-[var(--text-soft)] text-[12px] bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)]">
          No tienes ninguna inversión registrada todavía.
        </div>
      )}

      <button 
        onClick={() => setIsModalOpen(true)}
        className="w-full bg-[var(--gold)] text-[#0D0D12] font-semibold text-[13px] p-3 rounded-[var(--radius)] cursor-pointer border-none shadow-sm active:scale-95 transition-transform"
      >
        + Añadir inversión
      </button>

      <AddInvestmentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

    </div>
  );
}