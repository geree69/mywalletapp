'use client';

import { useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import AddInvestmentModal from '../../components/AddInvestmentModal';

const fmt = (n: number) => {
  const v = Number(n) || 0;
  return v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
};

const fmtSigned = (n: number) => {
  const v = Number(n) || 0;
  return (v >= 0 ? "+" : "") + fmt(v);
};

export default function InversionPage() {
  const { state, saveState } = useAppContext();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { totalBase, totalVal, delta, pct, categorias } = useMemo(() => {
    const invs = state.investments || [];
    
    const base = invs.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
    const val = invs.reduce((s: number, i: any) => s + Number(i.currentValue || 0), 0);
    const d = val - base;
    const p = base > 0 ? (d / base) * 100 : 0;

    const agrupado: Record<string, Record<string, any[]>> = {};
    
    invs.forEach((i: any) => {
      const cat = i.type || "Otros";
      // Si antes se guardó sin nombre, pondrá "Activo sin nombre" para que sepas cuál borrar
      const name = (i.name && i.name.trim() !== "") ? i.name : "Activo sin nombre";
      
      if (!agrupado[cat]) agrupado[cat] = {};
      if (!agrupado[cat][name]) agrupado[cat][name] = [];
      agrupado[cat][name].push(i);
    });

    return { 
      totalBase: base, 
      totalVal: val, 
      delta: d, 
      pct: p, 
      categorias: agrupado 
    };
  }, [state.investments]);

  // Función para ELIMINAR inversiones atascadas
  const handleDeleteInvestment = async (id: string, name: string) => {
    if (!confirm(`¿Seguro que quieres eliminar la inversión "${name}"?`)) return;
    
    const newState = { ...state };
    newState.investments = (newState.investments || []).filter((i: any) => i.id !== id);
    await saveState(newState);
  };

  return (
    <div className="relative min-h-full pb-16">
      <h2 className="font-['Playfair_Display'] text-[20px] font-semibold m-0 mb-1.5 text-[var(--ink)] tracking-wide">
        Inversiones
      </h2>
      <p className="text-[13px] text-[var(--text-soft)] m-0 mb-5 leading-relaxed">
        Tus activos invertidos y su rendimiento actual.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-4">
          <p className="text-[12px] text-[var(--text-soft)] m-0 mb-1.5 font-medium">Invertido</p>
          <p className="font-['IBM_Plex_Mono'] text-[20px] font-medium text-[var(--ink)]">
            {fmt(totalBase)}
          </p>
        </div>
        <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-4">
          <p className="text-[12px] text-[var(--text-soft)] m-0 mb-1.5 font-medium">Valor actual</p>
          <p className={`font-['IBM_Plex_Mono'] text-[20px] font-medium ${delta >= 0 ? 'text-[var(--teal-d)]' : 'text-[var(--coral)]'}`}>
            {fmt(totalVal)}
          </p>
        </div>
      </div>

      <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-4 mb-3">
        <div className="flex justify-between text-[13px] text-[var(--text-soft)]">
          <span>Rentabilidad total:</span>
          <span className={`font-['IBM_Plex_Mono'] font-medium ${delta >= 0 ? 'text-[var(--teal-d)]' : 'text-[var(--coral)]'}`}>
            {fmtSigned(delta)} ({delta >= 0 ? '+' : ''}{pct.toFixed(1)}%)
          </span>
        </div>
      </div>

      {Object.keys(categorias).length > 0 ? (
        Object.keys(categorias).map((catName) => {
          const activos = categorias[catName];
          
          let catBase = 0;
          let catVal = 0;
          Object.values(activos).forEach(lotes => {
            lotes.forEach(lote => {
              catBase += Number(lote.amount || 0);
              catVal += Number(lote.currentValue || 0);
            });
          });
          
          const catDelta = catVal - catBase;
          const catPct = catBase > 0 ? (catDelta / catBase) * 100 : 0;

          return (
            <div key={catName} className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-3 px-4 mb-2.5">
              <details open className="group">
                <summary className="cursor-pointer flex justify-between items-center list-none [&::-webkit-details-marker]:hidden">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[14px] text-[var(--ink)]">{catName}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-[6px] font-semibold uppercase tracking-wider ${catDelta >= 0 ? 'bg-[var(--teal-l)] text-[var(--teal-d)]' : 'bg-[var(--gold-l)] text-[var(--gold)]'}`}>
                      {catDelta >= 0 ? '+' : ''}{catPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-['IBM_Plex_Mono'] text-[15px] font-medium text-[var(--gold)] block">
                      {fmt(catVal)}
                    </span>
                  </div>
                </summary>
                
                <div className="mt-3 pt-2 border-t border-dashed border-[var(--paper-line)]">
                  {Object.keys(activos).map((assetName) => {
                    const lotes = activos[assetName];
                    
                    let assetBase = 0;
                    let assetVal = 0;
                    lotes.forEach(l => {
                      assetBase += Number(l.amount || 0);
                      assetVal += Number(l.currentValue || 0);
                    });
                    const assetDelta = assetVal - assetBase;
                    const assetPct = assetBase > 0 ? (assetDelta / assetBase) * 100 : 0;

                    return (
                      <div key={assetName} className="bg-[var(--paper)] border border-[var(--paper-line)] rounded-[8px] p-2.5 mb-2 last:mb-0">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[13px] text-[var(--ink)]">
                              {assetName}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-[6px] font-semibold uppercase tracking-wider ${assetDelta >= 0 ? 'bg-[var(--teal-l)] text-[var(--teal-d)]' : 'bg-[var(--gold-l)] text-[var(--gold)]'}`}>
                              {assetDelta >= 0 ? '+' : ''}{assetPct.toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-['IBM_Plex_Mono'] text-[14px] font-medium text-[var(--gold)] block">
                              {fmt(assetVal)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 pt-1.5 border-t border-dashed border-[var(--paper-line)]">
                          {lotes.map((lote: any) => {
                            const hasQty = Number(lote.quantity) > 0;

                            return (
                              <div key={lote.id} className="py-2 border-b border-[rgba(255,255,255,0.03)] last:border-b-0 flex justify-between items-start">
                                <div>
                                  <p className="text-[12px] m-0 font-medium text-[var(--ink)]">
                                    Bróker: {lote.where || 'Desconocido'} {lote.date ? `• ${lote.date}` : ''}
                                  </p>
                                  <p className="text-[11px] m-0 mt-0.5 text-[var(--text-soft)]">Invertido: {fmt(lote.amount)}</p>
                                  {hasQty && (
                                    <p className="text-[11px] m-0 mt-0.5 text-[var(--text-soft)]">
                                      Compra: {fmt(lote.buyPrice)}/ud • {lote.quantity} ud
                                    </p>
                                  )}
                                </div>
                                <button 
                                  onClick={() => handleDeleteInvestment(lote.id, assetName)}
                                  className="text-[16px] text-[var(--text-soft)] hover:text-[var(--coral)] bg-transparent border-none cursor-pointer px-2 py-1 leading-none"
                                  title="Eliminar registro"
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            </div>
          );
        })
      ) : (
        <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)]">
          <div className="text-center py-10 px-2 text-[var(--text-soft)] text-[13px]">
            Aún no has añadido ninguna inversión.
          </div>
        </div>
      )}

      <div className="mt-4">
        <button 
          className="w-full bg-[var(--gold)] text-[#0D0D12] font-semibold text-[14px] p-3 rounded-[10px] border-none cursor-pointer active:scale-95 transition-transform"
          onClick={() => setIsAddModalOpen(true)}
        >
          + Añadir inversión
        </button>
      </div>

      <AddInvestmentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
}