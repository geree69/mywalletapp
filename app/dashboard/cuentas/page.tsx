'use client';

import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

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

export default function CuentasPage() {
  const { state, saveState } = useAppContext();
  
  const [name, setName] = useState('Cuenta General');
  const [type, setType] = useState('general');

  const accounts = state.accounts || [];
  const transactions = expandTxs(state.transactions || []);

  const accountsWithBalance = accounts.map((acc: any) => {
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

  const totalAhorro = accountsWithBalance.filter((a: any) => a.type === 'savings').reduce((sum: number, a: any) => sum + a.computedBalance, 0);
  const totalCorriente = accountsWithBalance.filter((a: any) => a.type === 'normal' || a.type === 'general' || !a.type).reduce((sum: number, a: any) => sum + a.computedBalance, 0);

  const handleCreate = async () => {
    const finalName = name.trim() || (type === 'general' ? 'Cuenta General' : type === 'savings' ? 'Cuenta de Ahorro' : 'Cuenta Corriente');
    const newState = { 
      ...state, 
      accounts: [...accounts, { 
        id: uid(), 
        name: finalName, 
        type, 
        tae: type === 'savings' ? 2.5 : 0 
      }] 
    };
    await saveState(newState);
    setName('Cuenta General');
    setType('general');
  };

  const handleDelete = async (id: string, accName: string) => {
    if (!confirm(`¿Seguro que quieres borrar la cuenta "${accName}"?`)) return;
    const newState = { ...state, accounts: accounts.filter((a: any) => a.id !== id) };
    await saveState(newState);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-h-[680px] relative overflow-hidden">
      
      {/* CABECERA FIJA */}
      <div className="shrink-0 mb-3">
        <h2 className="font-['Playfair_Display'] text-[20px] font-semibold m-0 mb-1 text-[var(--ink)] tracking-wide">
          Cuentas Bancarias
        </h2>
        <p className="text-[12px] text-[var(--text-soft)] m-0 leading-relaxed">
          Gestiona tus cuentas corrientes, generales y de ahorro.
        </p>
      </div>

      {/* CONTENIDO CON SCROLL INTERNO */}
      <div className="flex-1 overflow-y-auto pr-1 pb-16 space-y-4">
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-3.5">
            <p className="text-[11px] text-[var(--text-soft)] m-0 mb-1 font-medium">Total en Ahorros</p>
            <p className="font-['IBM_Plex_Mono'] text-[16px] font-medium text-[var(--teal-d)]">
              {fmt(totalAhorro)}
            </p>
          </div>
          <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-3.5">
            <p className="text-[11px] text-[var(--text-soft)] m-0 mb-1 font-medium">Total Corriente</p>
            <p className="font-['IBM_Plex_Mono'] text-[16px] font-medium text-[var(--ink)]">
              {fmt(totalCorriente)}
            </p>
          </div>
        </div>

        {/* TARJETA DE CREACIÓN */}
        <div className="bg-gradient-to-br from-[var(--paper-2)] to-[var(--paper)] border border-[var(--paper-line)] rounded-[var(--radius)] p-4 shadow-sm space-y-3">
          <h3 className="text-[14px] font-semibold text-[var(--ink)] m-0 font-['Playfair_Display']">Añadir nueva cuenta</h3>
          
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] text-[var(--text-soft)] mb-1.5 font-medium">Nombre</label>
              <input 
                type="text" placeholder="Ej. Mi cuenta..." value={name} onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] text-[13px] outline-none focus:border-[var(--gold)]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--text-soft)] mb-1.5 font-medium">Tipo de cuenta</label>
              <select 
                value={type} 
                onChange={(e) => {
                  const val = e.target.value;
                  setType(val);
                  if (val === 'general') setName('Cuenta General');
                  else if (val === 'normal') setName('Cuenta Corriente');
                  else if (val === 'savings') setName('Cuenta de Ahorro');
                }}
                className="w-full p-2.5 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] text-[13px] outline-none focus:border-[var(--gold)] cursor-pointer"
              >
                <option value="general">Cuenta General (Todo en uno)</option>
                <option value="normal">Corriente (Día a día)</option>
                <option value="savings">De Ahorro</option>
              </select>
            </div>
          </div>
          
          <button 
            onClick={handleCreate} 
            className="w-full bg-[var(--gold)] text-[#0D0D12] font-semibold text-[13px] p-2.5 rounded-[10px] active:scale-95 transition-transform cursor-pointer border-none shadow-sm"
          >
            + Añadir cuenta
          </button>
        </div>

        <div>
          <h3 className="font-['Playfair_Display'] text-[16px] font-semibold m-0 mb-2.5 text-[var(--ink)] tracking-wide">
            Tus cuentas activas
          </h3>
          <div className="space-y-2.5">
            {accountsWithBalance.length > 0 ? (
              accountsWithBalance.map((acc: any) => (
                <div key={acc.id} className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-3.5 flex justify-between items-center transition-all hover:border-[rgba(244,197,99,0.3)]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[14px] text-[var(--ink)]">{acc.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-[5px] font-semibold uppercase tracking-wider ${
                        acc.type === 'savings' 
                          ? 'bg-[var(--teal-l)] text-[var(--teal-d)]' 
                          : 'bg-[rgba(255,255,255,0.05)] text-[var(--text-soft)] border border-[var(--paper-line)]'
                      }`}>
                        {acc.type === 'savings' ? 'Ahorro' : acc.type === 'general' ? 'General (Todo en uno)' : 'Corriente'}
                      </span>
                    </div>
                    <p className="text-[12px] text-[var(--text-soft)] m-0 mt-1 font-['IBM_Plex_Mono']">
                      Saldo: <span className={acc.computedBalance >= 0 ? 'text-[var(--ink)]' : 'text-[var(--coral)]'}>{fmt(acc.computedBalance)}</span>
                    </p>
                  </div>
                  <button onClick={() => handleDelete(acc.id, acc.name)} className="text-[18px] text-[var(--text-soft)] hover:text-[var(--coral)] bg-transparent border-none p-1.5 cursor-pointer transition-colors leading-none">
                    ×
                  </button>
                </div>
              ))
            ) : (
               <div className="text-center py-4 text-[var(--text-soft)] text-[12px] bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)]">
                 Aún no has creado ninguna cuenta.
               </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}