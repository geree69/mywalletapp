'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const fmt = (n: number) => {
  const v = Number(n) || 0;
  return v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
};

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const BILLS = [500, 200, 100, 50, 20, 10, 5];
const COINS = [2, 1, 0.50, 0.20, 0.10, 0.05, 0.02, 0.01];

export default function TransactionModal({ isOpen, onClose, editItem }: { isOpen: boolean, onClose: () => void, editItem?: any }) {
  const { state, saveState } = useAppContext();
  
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  
  const [isRecurring, setIsRecurring] = useState(false);
  const [split, setSplit] = useState(false);
  const [accountId, setAccountId] = useState('');

  // Estados para el autocompletado
  const [titleFocus, setTitleFocus] = useState(false);
  const [categoryFocus, setCategoryFocus] = useState(false);

  // NUEVO: Estado para llevar la cuenta de billetes y monedas en ingresos
  const [cashCounts, setCashCounts] = useState<Record<number, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setType(editItem.type || 'expense');
        setAmount(editItem.amount?.toString() || '');
        setDate(editItem.date || new Date().toISOString().split('T')[0]);
        setTitle(editItem.title || '');
        setCategory(editItem.category || '');
        setIsRecurring(editItem.isRecurring || false);
        setSplit(editItem.split || false);
        setAccountId(editItem.accountId || (state.accounts && state.accounts.length > 0 ? state.accounts[0].id : ''));
        setCashCounts(editItem.cashCounts || {});
      } else {
        setType('expense');
        setAmount('');
        setDate(new Date().toISOString().split('T')[0]);
        setTitle('');
        setCategory('');
        setIsRecurring(false);
        setSplit(false);
        setAccountId(state.accounts && state.accounts.length > 0 ? state.accounts[0].id : '');
        setCashCounts({});
      }
    }
  }, [isOpen, editItem, state.accounts]);

  const { uniqueTitles, uniqueCategories } = useMemo(() => {
    const titlesSet = new Set<string>();
    const categoriesSet = new Set<string>();
    
    (state.transactions || []).forEach((t: any) => {
      if (t.title) titlesSet.add(t.title);
      if (t.category) categoriesSet.add(t.category);
    });

    return {
      uniqueTitles: Array.from(titlesSet),
      uniqueCategories: Array.from(categoriesSet)
    };
  }, [state.transactions]);

  const filteredTitles = useMemo(() => {
    if (!title.trim()) return uniqueTitles.slice(0, 5);
    return uniqueTitles.filter(t => t.toLowerCase().includes(title.toLowerCase()));
  }, [title, uniqueTitles]);

  const filteredCategories = useMemo(() => {
    if (!category.trim()) return uniqueCategories.slice(0, 5);
    return uniqueCategories.filter(c => c.toLowerCase().includes(category.toLowerCase()));
  }, [category, uniqueCategories]);

  if (!isOpen) return null;

  // Lógica para detectar si hay que enseñar la calculadora de efectivo
  const selectedAccount = state.accounts?.find((a: any) => a.id === accountId);
  const isCashAccount = selectedAccount?.type === 'cash';
  const showCashGrid = type === 'income' && isCashAccount;

  // Cálculo de la suma de monedas/billetes
  const cashTotal = Object.entries(cashCounts).reduce((sum, [val, count]) => {
    const numericVal = parseFloat(val);
    const numericCount = parseInt(count) || 0;
    return sum + (numericVal * 100 * numericCount);
  }, 0) / 100;

  // El importe real a guardar dependerá de si usamos la cuadrícula o el input
  const currentAmountVal = showCashGrid ? cashTotal : (parseFloat(amount) || 0);

  const budgetStartStr = state.budgetStartMonth || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [bY, bM] = budgetStartStr.split('-').map(Number);
  const [tY, tM] = (date || new Date().toISOString().split('T')[0]).split('-').map(Number);
  
  let autoSplitMonths = 12;
  if (tY && tM) {
    if (tM >= bM) {
      autoSplitMonths = 12 - tM + bM;
    } else {
      autoSplitMonths = bM - tM;
    }
  }
  if (autoSplitMonths <= 0) autoSplitMonths = 1;

  const handleSave = async () => {
    if (!currentAmountVal || !date || !title.trim() || !category.trim()) {
      return alert("Por favor rellena importe, fecha, título y categoría.");
    }

    const newState = { ...state };
    const currentTxs = state.transactions || [];

    let splitDetail: any[] = [];
    
    if (type === 'income' && split && autoSplitMonths > 0) {
      const [y, m] = date.split('-').map(Number);
      let currY = y;
      let currM = m;
      const monthlyAmount = currentAmountVal / autoSplitMonths;
      
      for (let i = 0; i < autoSplitMonths; i++) {
        const key = `${currY}-${String(currM).padStart(2, '0')}`;
        splitDetail.push({ key, amount: monthlyAmount });
        currM++;
        if (currM > 12) { currM = 1; currY++; }
      }
    }

    const newTx = {
      id: editItem ? editItem.id : uid(),
      type, 
      amount: currentAmountVal, 
      date, 
      title: title.trim(), 
      category: category.trim(),
      isRecurring: type === 'expense' ? isRecurring : false,
      split: type === 'income' ? split : false,
      splitMonths: type === 'income' ? autoSplitMonths : null,
      splitDetail: type === 'income' && split ? splitDetail : null,
      accountId,
      // Guardamos el registro de billetes en la transacción
      cashCounts: showCashGrid ? cashCounts : null 
    };

    let updatedAccounts = [...(state.accounts || [])];

    // 1. REVERTIR EL MOVIMIENTO ANTIGUO (Si estamos editando)
    if (editItem && editItem.accountId) {
      const oldVal = Number(editItem.amount) || 0;
      updatedAccounts = updatedAccounts.map((acc: any) => {
        if (acc.id === editItem.accountId) {
          let revertedCashCounts = { ...(acc.cashCounts || {}) };
          
          // Si el movimiento antiguo tenía billetes, se los restamos a la hucha
          if (acc.type === 'cash' && editItem.cashCounts) {
            Object.entries(editItem.cashCounts).forEach(([val, count]) => {
              const num = parseInt(count as string) || 0;
              if (num > 0) {
                revertedCashCounts[val] = Math.max(0, (parseInt(revertedCashCounts[val]) || 0) - num).toString();
              }
            });
          }

          return { 
            ...acc, 
            balance: Number(acc.balance || 0) + (editItem.type === 'expense' ? oldVal : -oldVal),
            cashCounts: revertedCashCounts
          };
        }
        return acc;
      });
    }

    // 2. APLICAR EL NUEVO MOVIMIENTO
    if (accountId) {
      updatedAccounts = updatedAccounts.map((acc: any) => {
        if (acc.id === accountId) {
          let newCashCounts = { ...(acc.cashCounts || {}) };
          
          // Si es un ingreso en efectivo con cuadrícula, sumamos los billetes nuevos a la hucha
          if (acc.type === 'cash' && showCashGrid) {
            Object.entries(cashCounts).forEach(([val, count]) => {
              const num = parseInt(count as string) || 0;
              if (num > 0) {
                newCashCounts[val] = ((parseInt(newCashCounts[val]) || 0) + num).toString();
              }
            });
          }

          return { 
            ...acc, 
            balance: Number(acc.balance || 0) + (type === 'expense' ? -currentAmountVal : currentAmountVal),
            cashCounts: newCashCounts
          };
        }
        return acc;
      });
    }

    if (editItem) {
      newState.transactions = currentTxs.map((t: any) => t.id === editItem.id ? newTx : t);
    } else {
      newState.transactions = [...currentTxs, newTx];
    }

    newState.accounts = updatedAccounts;
    // Respetamos la exclusión del balance global
    newState.balance = updatedAccounts.reduce((sum, acc) => acc.excludeFromTotal ? sum : sum + Number(acc.balance || 0), 0);

    const ok = await saveState(newState);
    if (ok) onClose();
  };

  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-[4px] z-[100] flex items-end justify-center" onClick={onClose}>
      <div className="bg-[var(--paper)] w-full max-h-[85%] rounded-t-[24px] flex flex-col border-t border-[var(--paper-line)] animate-[fade_0.3s_ease]" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-[var(--paper-line)] shrink-0 flex justify-between items-center relative z-20">
          <h3 className="font-['Playfair_Display'] text-[19px] font-bold m-0 text-[var(--ink)]">{editItem ? 'Editar movimiento' : 'Añadir movimiento'}</h3>
          <button onClick={onClose} className="text-[24px] leading-none text-[var(--text-soft)] bg-transparent border-none cursor-pointer p-1">×</button>
        </div>
        
        <div className="p-6 overflow-y-auto pb-10 relative z-10">
          <div className="flex gap-2 mb-5">
            <button className={`flex-1 p-2.5 rounded-[10px] border text-[13px] font-medium transition-colors ${type === 'expense' ? 'bg-[var(--coral-l)] border-[var(--coral)] text-[var(--coral)]' : 'bg-[var(--paper-2)] border-[var(--paper-line)] text-[var(--text-soft)]'}`} onClick={() => setType('expense')}>Gasto</button>
            <button className={`flex-1 p-2.5 rounded-[10px] border text-[13px] font-medium transition-colors ${type === 'income' ? 'bg-[var(--teal-l)] border-[var(--teal-d)] text-[var(--teal-d)]' : 'bg-[var(--paper-2)] border-[var(--paper-line)] text-[var(--text-soft)]'}`} onClick={() => setType('income')}>Ingreso</button>
          </div>

          <div className="mb-4">
            <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">¿En qué cuenta?</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)]">
              {state.accounts && state.accounts.map((acc: any) => (
                <option key={acc.id} value={acc.id}>{acc.name} {acc.type === 'cash' ? '(Efectivo)' : ''}</option>
              ))}
            </select>
          </div>

          <div className={`grid ${showCashGrid ? 'grid-cols-1' : 'grid-cols-2'} gap-3 mb-4`}>
            {!showCashGrid && (
              <div className="animate-[fade_0.2s_ease]">
                <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">Importe (€)</label>
                <input type="number" step="any" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)]" />
              </div>
            )}
            <div>
              <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">Fecha</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)] [color-scheme:dark]" />
            </div>
          </div>

          {/* Cuadrícula de Efectivo (Solo visible si es Ingreso y Efectivo) */}
          {showCashGrid && (
            <div className="mb-4 animate-[fade_0.2s_ease] border border-[var(--paper-line)] rounded-[12px] p-3.5 bg-[var(--paper-2)] shadow-sm">
               <label className="block text-[11px] font-medium text-[var(--text-soft)] uppercase mb-3 text-center tracking-wider">Calculadora de Billetes y Monedas</label>
               
               {/* Billetes */}
               <div className="grid grid-cols-4 gap-2 mb-2">
                 {BILLS.map((val) => (
                    <div key={val} className="flex flex-col border border-[var(--paper-line)] rounded-[6px] overflow-hidden bg-[var(--paper)] focus-within:border-[var(--teal-d)] transition-colors shadow-sm">
                      <div className="bg-[var(--paper-2)] text-[10px] text-center font-bold text-[var(--text-soft)] py-1 border-b border-[var(--paper-line)]">{val}€</div>
                      <input 
                        type="number" min="0" placeholder="0" inputMode="numeric"
                        value={cashCounts[val] || ''}
                        onChange={(e) => setCashCounts(prev => ({...prev, [val]: e.target.value}))}
                        className="w-full bg-transparent text-center text-[13px] py-1.5 outline-none font-['IBM_Plex_Mono'] text-[var(--ink)] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                    </div>
                 ))}
               </div>

               {/* Monedas */}
               <div className="grid grid-cols-4 gap-2">
                 {COINS.map((val) => (
                    <div key={val} className="flex flex-col border border-[var(--paper-line)] rounded-[6px] overflow-hidden bg-[var(--paper)] focus-within:border-[var(--teal-d)] transition-colors shadow-sm">
                      <div className="bg-[var(--paper-2)] text-[10px] text-center font-bold text-[var(--text-soft)] py-1 border-b border-[var(--paper-line)]">{val >= 1 ? `${val}€` : `${(val * 100).toFixed(0)}c`}</div>
                      <input 
                        type="number" min="0" placeholder="0" inputMode="numeric"
                        value={cashCounts[val] || ''}
                        onChange={(e) => setCashCounts(prev => ({...prev, [val]: e.target.value}))}
                        className="w-full bg-transparent text-center text-[13px] py-1.5 outline-none font-['IBM_Plex_Mono'] text-[var(--ink)] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                    </div>
                 ))}
               </div>

               <div className="flex items-center justify-between bg-[var(--paper)] px-4 py-2.5 rounded-[8px] border border-[var(--paper-line)] mt-3">
                  <span className="text-[11px] font-medium text-[var(--text-soft)] uppercase tracking-wider">Total a Ingresar:</span>
                  <span className="font-['IBM_Plex_Mono'] text-[18px] font-bold text-[var(--teal-d)]">+{fmt(cashTotal)}</span>
               </div>
            </div>
          )}

          {/* Campo de Título con Autocompletado */}
          <div className="mb-4 relative">
            <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">Título / Concepto</label>
            <input 
              type="text" 
              placeholder="Ej. Bizum Carlos, Venta de Wallapop..." 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              onFocus={() => setTitleFocus(true)}
              onBlur={() => setTimeout(() => setTitleFocus(false), 200)}
              className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)]" 
            />
            {titleFocus && filteredTitles.length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] bg-[var(--paper)] border border-[var(--paper-line)] rounded-[10px] shadow-lg max-h-[140px] overflow-y-auto z-30">
                {filteredTitles.map((t, idx) => (
                  <div 
                    key={idx}
                    onMouseDown={() => { setTitle(t); setTitleFocus(false); }}
                    className="px-3.5 py-2 text-[13px] text-[var(--ink)] hover:bg-[var(--paper-2)] cursor-pointer border-b border-[var(--paper-line)] last:border-b-0"
                  >
                    {t}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Campo de Categoría con Autocompletado */}
          <div className="mb-5 relative">
            <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">Categoría</label>
            <input 
              type="text" 
              placeholder="Escribe la categoría..." 
              value={category} 
              onChange={(e) => setCategory(e.target.value)} 
              onFocus={() => setCategoryFocus(true)}
              onBlur={() => setTimeout(() => setCategoryFocus(false), 200)}
              className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)]" 
            />
            {categoryFocus && filteredCategories.length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] bg-[var(--paper)] border border-[var(--paper-line)] rounded-[10px] shadow-lg max-h-[140px] overflow-y-auto z-30">
                {filteredCategories.map((c, idx) => (
                  <div 
                    key={idx}
                    onMouseDown={() => { setCategory(c); setCategoryFocus(false); }}
                    className="px-3.5 py-2 text-[13px] text-[var(--ink)] hover:bg-[var(--paper-2)] cursor-pointer border-b border-[var(--paper-line)] last:border-b-0"
                  >
                    {c}
                  </div>
                ))}
              </div>
            )}
          </div>

          {type === 'expense' && (
            <div className="flex items-center gap-2 mb-6">
              <input type="checkbox" id="inpRecurring" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="w-4 h-4 accent-[var(--gold)] cursor-pointer" />
              <label htmlFor="inpRecurring" className="cursor-pointer text-[13px] text-[var(--ink)] font-semibold text-[var(--gold)]">Gasto recurrente mensual</label>
            </div>
          )}

          {type === 'income' && (
            <div className={`mb-6 p-3.5 rounded-[12px] border transition-colors ${split ? 'bg-[var(--paper-2)] border-[var(--gold)]' : 'bg-[var(--paper)] border-[var(--paper-line)]'}`}>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="inpSplit" checked={split} onChange={(e) => setSplit(e.target.checked)} className="w-4 h-4 accent-[var(--gold)] cursor-pointer" />
                <label htmlFor="inpSplit" className="cursor-pointer text-[13px] text-[var(--ink)] font-semibold text-[var(--gold)]">
                  Repartir ingreso (Paga extra, Bono...)
                </label>
              </div>
              
              {split && (
                <div className="mt-3 pt-3 border-t border-[var(--paper-line)] animate-[fade_0.2s_ease]">
                  <p className="text-[11px] text-[var(--text-soft)] mb-2 m-0 font-medium leading-relaxed">
                    Tu ciclo anual empieza en <strong className="text-[var(--ink)]">{MONTH_NAMES[bM - 1]}</strong>. Faltan <strong className="text-[var(--ink)]">{autoSplitMonths} meses</strong> para completarlo desde la fecha que has elegido.
                  </p>
                  
                  {currentAmountVal > 0 && (
                    <p className="text-[11px] text-[var(--teal-d)] m-0 font-medium bg-[rgba(42,157,143,0.1)] p-2 rounded-[6px]">
                      Se sumarán {fmt(currentAmountVal / autoSplitMonths)} extra a tu presupuesto durante {autoSplitMonths} {autoSplitMonths === 1 ? 'mes' : 'meses'} seguidos.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <button onClick={handleSave} className="w-full bg-[var(--gold)] text-[#0D0D12] font-semibold text-[14px] p-3 rounded-[10px] border-none cursor-pointer active:scale-95 transition-transform">
            {editItem ? 'Guardar cambios' : 'Registrar movimiento'}
          </button>
        </div>
      </div>
    </div>
  );
}