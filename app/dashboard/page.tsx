'use client';

import { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import AccountModal from '../components/AccountModal';

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const fmt = (n: number) => (Number(n) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

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

export default function ResumenPage() {
  const { state, saveState } = useAppContext();
  
  const [selectedAccId, setSelectedAccId] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const accounts = state.accounts || [];

  const { 
    ingresosMes, gastosMes, ultimosMovimientos, mesActualNombre, saldoVisible
  } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const ykey = currentYear + "-" + String(currentMonth).padStart(2, '0');
    
    const rawTxs = (state.transactions || []).map((t: any) => ({
      ...t,
      accountId: t.accountId || (accounts.length > 0 ? accounts[0].id : '')
    }));

    const todasLasTxs = expandTxs(rawTxs);
    const filteredTxs = todasLasTxs.filter((t: any) => selectedAccId === 'all' || t.accountId === selectedAccId);

    let income = 0;
    let expense = 0;

    // 1. CÁLCULO SEGURO DE FLUJO DE CAJA (Evita el doble negativo)
    filteredTxs.forEach((t: any) => {
      const tKey = (t.date || '').slice(0, 7);
      if (tKey === ykey) {
        // Detecta si es gasto tanto por "type" como por llevar signo negativo
        const isExpense = t.type === 'expense' || Number(t.amount || 0) < 0;
        const absAmount = Math.abs(Number(t.amount || 0)); // Convierte a positivo siempre
        
        if (isExpense) {
          expense += absAmount;
        } else {
          income += absAmount;
        }
      }
    });

    // 2. LA FUENTE DE LA VERDAD DEL SALDO SON LAS CUENTAS, NO EL HISTORIAL
    let saldoReal = 0;
    if (selectedAccId === 'all') {
      saldoReal = accounts.reduce((sum: number, acc: any) => sum + Number(acc.balance || 0), 0);
    } else {
      saldoReal = Number(accounts.find((a: any) => a.id === selectedAccId)?.balance || 0);
    }

    const recent = [...filteredTxs].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 4);

    return {
      ingresosMes: income,
      gastosMes: expense,
      ultimosMovimientos: recent,
      mesActualNombre: MONTHS[now.getMonth()],
      saldoVisible: saldoReal
    };
  }, [state.transactions, accounts, selectedAccId]);

  const handleDeleteTx = async (tx: any) => {
    if (!confirm(`¿Seguro que quieres borrar "${tx.title || tx.category}"?`)) return;
    const newState = { ...state };
    
    const idToDelete = tx.originalId || tx.id;
    
    // Al borrar un movimiento, devolvemos el dinero exacto a la cuenta real
    const isExpense = tx.type === 'expense' || Number(tx.amount || 0) < 0;
    const absAmount = Math.abs(Number(tx.amount || 0));
    // Si era un gasto, lo sumamos de vuelta (+). Si era un ingreso, lo restamos (-)
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
    
    // Forzamos que la variable global se sincronice con la realidad de las cuentas
    newState.balance = updatedAccounts.reduce((sum: number, acc: any) => sum + Number(acc.balance || 0), 0);

    await saveState(newState);
  };

  const handleDeleteAccount = async () => {
    if (selectedAccId === 'all') return;
    const accToDelete = accounts.find((a: any) => a.id === selectedAccId);
    if (!confirm(`¿Seguro que quieres borrar la cuenta "${accToDelete?.name || ''}" y todos sus movimientos asociados?`)) return;

    const newState = { ...state };
    const updatedAccounts = accounts.filter((a: any) => a.id !== selectedAccId);
    newState.accounts = updatedAccounts;
    newState.transactions = (newState.transactions || []).filter((t: any) => t.accountId !== selectedAccId);

    // Sincronizar variable global
    newState.balance = updatedAccounts.reduce((sum: number, acc: any) => sum + Number(acc.balance || 0), 0);

    await saveState(newState);
    setSelectedAccId('all');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-h-[680px] relative overflow-hidden">
      
      <div className="shrink-0 mb-3 flex items-center justify-between">
        <h2 className="font-['Playfair_Display'] text-[20px] font-semibold m-0 text-[var(--ink)] tracking-wide">
          Resumen
        </h2>
        {accounts.length > 0 && (
          <div className="flex items-center gap-2">
            <select 
              value={selectedAccId} 
              onChange={(e) => setSelectedAccId(e.target.value)}
              className="bg-[var(--paper-2)] border border-[var(--paper-line)] text-[var(--ink)] text-[12px] font-semibold rounded-[8px] px-2 py-1.5 outline-none focus:border-[var(--gold)] cursor-pointer"
            >
              <option value="all">Todas las cuentas</option>
              {accounts.map((acc: any) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>

            {selectedAccId !== 'all' && (
              <button 
                onClick={handleDeleteAccount}
                className="text-[11px] font-medium text-[var(--coral)] bg-[var(--paper-2)] border border-[var(--paper-line)] px-2.5 py-1.5 rounded-[8px] cursor-pointer hover:border-[var(--coral)] transition-colors"
              >
                Eliminar cuenta
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-1 pb-16 space-y-4">
        
        <div className="bg-gradient-to-br from-[var(--paper-2)] to-[var(--paper)] border border-[var(--paper-line)] rounded-[var(--radius)] p-4 shadow-sm">
          <p className="text-[12px] text-[var(--text-soft)] m-0 mb-1 font-medium uppercase tracking-widest">
            {selectedAccId === 'all' && accounts.length > 1 ? 'Saldo Total Disponible' : 'En cuenta ahora'}
          </p>
          <p className="font-['IBM_Plex_Mono'] text-[28px] font-medium text-[var(--ink)] m-0 transition-all duration-300">
            {fmt(saldoVisible)}
          </p>
        </div>

        <div>
          <p className="text-[13px] text-[var(--text-soft)] m-0 mb-2 font-medium">Movimientos de {mesActualNombre}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-3.5">
              <p className="text-[11px] text-[var(--text-soft)] m-0 mb-1 font-medium">Ingresos</p>
              <p className="font-['IBM_Plex_Mono'] text-[16px] font-medium text-[var(--teal-d)]">+{fmt(ingresosMes)}</p>
            </div>
            <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-3.5">
              <p className="text-[11px] text-[var(--text-soft)] m-0 mb-1 font-medium">Gastos</p>
              <p className="font-['IBM_Plex_Mono'] text-[16px] font-medium text-[var(--coral)]">-{fmt(gastosMes)}</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-['Playfair_Display'] text-[16px] font-semibold m-0 mb-2 text-[var(--ink)] tracking-wide">
            Últimos movimientos
          </h2>
          
          <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-4">
            {ultimosMovimientos.length > 0 ? (
              ultimosMovimientos.map((t: any) => {
                // RENDERIZADO VISUAL LIMPIO SIN DOBLE NEGATIVO
                const isExpense = t.type === 'expense' || Number(t.amount || 0) < 0;
                const absAmount = Math.abs(Number(t.amount || 0));

                return (
                  <div key={t.id} className="flex justify-between items-center py-2.5 border-b border-[var(--paper-line)] last:border-b-0 last:pb-0 first:pt-0">
                    <div>
                      <p className="text-[13px] font-medium text-[var(--ink)] m-0 mb-0.5">
                        {t.title || t.category}
                        {t.isRecurring && <span className="text-[var(--gold)] text-[9px] font-semibold border border-[var(--gold-l)] bg-[var(--gold-l)] px-1.5 py-0.2 rounded-[4px] ml-2 align-middle">Recurrente</span>}
                      </p>
                      <p className="text-[10px] text-[var(--text-soft)] m-0">
                        {t.category} . {t.date} 
                        {selectedAccId === 'all' && accounts.length > 1 && t.accountId && <span className="ml-1 text-[var(--gold)] opacity-80">({accounts.find((a:any)=>a.id===t.accountId)?.name || ''})</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`font-['IBM_Plex_Mono'] text-[14px] font-medium ${isExpense ? 'text-[var(--coral)]' : 'text-[var(--teal-d)]'}`}>
                        {isExpense ? '-' : '+'}{fmt(absAmount)}
                      </div>
                      <button 
                        onClick={() => handleDeleteTx(t)} 
                        className="text-[18px] text-[var(--text-soft)] hover:text-[var(--coral)] bg-transparent border-none p-1 cursor-pointer transition-colors leading-none" 
                        title="Borrar movimiento"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-[var(--text-soft)] text-[12px]">
                No hay movimientos recientes.
              </div>
            )}
          </div>
        </div>

      </div>

      <div className="absolute bottom-3 right-3 z-50">
        <button 
          onClick={() => setIsModalOpen(true)}
          title="Crear nueva cuenta"
          className="w-12 h-12 bg-[var(--gold)] text-[#0D0D12] rounded-full flex items-center justify-center text-[28px] font-light shadow-[0_4px_12px_rgba(244,197,99,0.5)] active:scale-90 transition-transform cursor-pointer border-none"
        >
          +
        </button>
      </div>

      <AccountModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

    </div>
  );
}