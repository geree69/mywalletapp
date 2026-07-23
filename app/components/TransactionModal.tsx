'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// MISMO MOTOR DEL TIEMPO AQUÍ
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

export default function TransactionModal({ isOpen, onClose, editItem }: { isOpen: boolean, onClose: () => void, editItem?: any }) {
  const { state, saveState } = useAppContext();
  
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [split, setSplit] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [accountId, setAccountId] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setType(editItem.type || 'expense');
        setAmount(editItem.amount?.toString() || '');
        setDate(editItem.date || new Date().toISOString().split('T')[0]);
        setTitle(editItem.title || '');
        setCategory(editItem.category || '');
        setSplit(editItem.split || false);
        setIsRecurring(editItem.isRecurring || false);
        setAccountId(editItem.accountId || (state.accounts && state.accounts.length > 0 ? state.accounts[0].id : ''));
      } else {
        setType('expense');
        setAmount('');
        setDate(new Date().toISOString().split('T')[0]);
        setTitle('');
        setCategory('');
        setSplit(false);
        setIsRecurring(false);
        setAccountId(state.accounts && state.accounts.length > 0 ? state.accounts[0].id : '');
      }
    }
  }, [isOpen, editItem, state.accounts]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const val = parseFloat(amount) || 0;
    if (!val || !date || !title.trim() || !category.trim()) return alert("Por favor rellena importe, fecha, título y categoría.");

    const newState = { ...state };
    const currentTxs = state.transactions || [];

    const newTx = {
      id: editItem ? editItem.id : uid(),
      type, amount: val, date, title: title.trim(), category: category.trim(),
      split: type === 'income' ? split : false,
      isRecurring: type === 'expense' ? isRecurring : false,
      accountId 
    };

    if (editItem) {
      newState.transactions = currentTxs.map((t: any) => t.id === editItem.id ? newTx : t);
    } else {
      newState.transactions = [...currentTxs, newTx];
    }

    // Calcula el balance global teniendo en cuenta las fechas que sí han llegado
    let globalBalance = 0;
    expandTxs(newState.transactions).forEach((t: any) => {
      if (t.type === 'income') globalBalance += Number(t.amount || 0);
      if (t.type === 'expense') globalBalance -= Number(t.amount || 0);
    });
    newState.balance = globalBalance;

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

          {state.accounts && state.accounts.length > 1 && (
            <div className="mb-4">
              <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">¿En qué cuenta?</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)]">
                {state.accounts.map((acc: any) => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">Importe (€)</label>
              <input type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)]" />
            </div>
            <div>
              <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">Fecha</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)] [color-scheme:dark]" />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">Título / Concepto</label>
            <input type="text" placeholder="Ej. Alquiler, Nómina..." value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)]" />
          </div>

          <div className="mb-5">
            <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">Categoría</label>
            <input type="text" placeholder="Escribe la categoría..." value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)]" />
          </div>

          {type === 'expense' && (
            <div className="flex items-center gap-2 mb-6">
              <input type="checkbox" id="inpRecurring" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="w-4 h-4 accent-[var(--gold)] cursor-pointer" />
              <label htmlFor="inpRecurring" className="cursor-pointer text-[13px] text-[var(--ink)] font-semibold text-[var(--gold)]">Gasto recurrente mensual</label>
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