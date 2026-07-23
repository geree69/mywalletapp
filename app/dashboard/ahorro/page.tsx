'use client';

import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';

const fmt = (n: number) => {
  return (Number(n) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
};

const expandTxs = (txs: any[]) => {
  const expanded: any[] = [];
  const todayStr = new Date().toISOString().split('T')[0];

  txs.forEach((t) => {
    if (!t.isRecurring) {
      expanded.push(t);
    } else {
      const [tY, tM, tD] = (t.date || '').split('-').map(Number);
      if (!tY) { expanded.push(t); return; }

      let currY = tY;
      let currM = tM;

      while (true) {
        const instanceDate = `${currY}-${String(currM).padStart(2, '0')}-${String(tD).padStart(2, '0')}`;
        if (instanceDate > todayStr) break;
        expanded.push({ ...t, date: instanceDate });
        currM++;
        if (currM > 12) { currM = 1; currY++; }
      }
    }
  });
  return expanded;
};

export default function AhorroPage() {
  const { state, saveState } = useAppContext();
  
  const accounts = state.accounts || [];
  const transactions = expandTxs(state.transactions || []);

  const savingsAccounts = accounts.filter((acc: any) => acc.type === 'savings');

  const accountsWithBalance = savingsAccounts.map((acc: any) => {
    let realBalance = 0;
    transactions.forEach((t: any) => {
      const tAccId = t.accountId || (accounts.length > 0 ? accounts[0].id : '');
      if (tAccId === acc.id) {
        if (t.type === 'income') realBalance += Number(t.amount || 0);
        if (t.type === 'expense') realBalance -= Number(t.amount || 0);
      }
    });
    return { ...acc, computedBalance: realBalance };
  });

  const totalSavings = accountsWithBalance.reduce((sum: number, a: any) => sum + a.computedBalance, 0);
  
  // Cálculo neto aplicando el 19% de retención fiscal estándar sobre los intereses brutos
  const totalAnnualNet = accountsWithBalance.reduce((sum: number, a: any) => {
    const tae = a.tae || 0;
    const gross = a.computedBalance * (tae / 100);
    return sum + (gross * 0.81); // 81% restante tras retener el 19% de IRPF
  }, 0);
  const totalMonthlyNet = totalAnnualNet / 12;

  const handleUpdateTae = async (accId: string, newTae: string) => {
    const taeVal = parseFloat(newTae) || 0;
    const updatedAccounts = accounts.map((acc: any) => 
      acc.id === accId ? { ...acc, tae: taeVal } : acc
    );
    await saveState({ ...state, accounts: updatedAccounts });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-h-[680px] relative overflow-hidden">
      
      {/* CABECERA FIJA */}
      <div className="shrink-0 mb-3">
        <h2 className="font-['Playfair_Display'] text-[20px] font-semibold m-0 mb-1 text-[var(--ink)] tracking-wide">
          Rendimiento y Ahorro
        </h2>
        <p className="text-[12px] text-[var(--text-soft)] m-0 leading-relaxed">
          Controla la rentabilidad TAE y las ganancias netas (aplicando un 19% de retención fiscal).
        </p>
      </div>

      {/* CONTENIDO CON SCROLL INTERNO */}
      <div className="flex-1 overflow-y-auto pr-1 pb-16 space-y-4">
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-3.5">
            <p className="text-[11px] text-[var(--text-soft)] m-0 mb-1 font-medium">Patrimonio en Ahorro</p>
            <p className="font-['IBM_Plex_Mono'] text-[16px] font-medium text-[var(--teal-d)]">
              {fmt(totalSavings)}
            </p>
          </div>
          <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-3.5">
            <p className="text-[11px] text-[var(--text-soft)] m-0 mb-1 font-medium">Ganancia Anual Neta</p>
            <p className="font-['IBM_Plex_Mono'] text-[16px] font-medium text-[var(--ink)]">
              +{fmt(totalAnnualNet)}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[var(--paper-2)] to-[var(--paper)] border border-[var(--paper-line)] rounded-[var(--radius)] p-4 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-[11px] text-[var(--text-soft)] m-0 mb-1 font-medium uppercase tracking-wider">Rendimiento mensual neto estimado</p>
            <p className="font-['IBM_Plex_Mono'] text-[18px] font-medium text-[var(--teal-d)] m-0">+{fmt(totalMonthlyNet)} <span className="text-[12px] text-[var(--text-soft)]">/ mes</span></p>
          </div>
        </div>

        <div>
          <h3 className="font-['Playfair_Display'] text-[16px] font-semibold m-0 mb-2.5 text-[var(--ink)] tracking-wide">
            Cuentas de ahorro y TAE (Neto)
          </h3>
          <div className="space-y-3">
            {accountsWithBalance.length > 0 ? (
              accountsWithBalance.map((acc: any) => {
                const annualGross = acc.computedBalance * ((acc.tae || 0) / 100);
                const annualNet = annualGross * 0.81; // Neto tras el 19% de impuestos
                const monthlyNet = annualNet / 12;

                return (
                  <div key={acc.id} className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-semibold text-[15px] text-[var(--ink)]">{acc.name}</span>
                        <p className="text-[12px] text-[var(--text-soft)] m-0 mt-0.5 font-['IBM_Plex_Mono']">
                          Saldo actual: <span className="text-[var(--ink)] font-medium">{fmt(acc.computedBalance)}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-[var(--teal-d)] font-medium font-['IBM_Plex_Mono'] block">
                          +{fmt(annualNet)} / año (neto)
                        </span>
                        <span className="text-[10px] text-[var(--text-soft)] font-['IBM_Plex_Mono']">
                          (+{fmt(monthlyNet)} / mes)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--paper-line)]">
                      <label className="text-[11px] text-[var(--text-soft)] font-medium">Interés TAE aplicable (%):</label>
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="number" 
                          step="0.01" 
                          value={acc.tae !== undefined ? acc.tae : 2.5} 
                          onChange={(e) => handleUpdateTae(acc.id, e.target.value)}
                          className="w-20 p-1.5 text-right rounded-[8px] border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] text-[13px] font-['IBM_Plex_Mono'] outline-none focus:border-[var(--gold)]"
                        />
                        <span className="text-[13px] text-[var(--text-soft)] font-medium">%</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
               <div className="text-center py-6 text-[var(--text-soft)] text-[12px] bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)]">
                 No tienes ninguna cuenta de tipo "Ahorro" creada.<br/>
                 <span className="text-[var(--gold)]">Ve al apartado de Cuentas para crear una.</span>
               </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}