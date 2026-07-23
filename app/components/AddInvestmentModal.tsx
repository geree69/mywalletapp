'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export default function AddInvestmentModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { state, saveState } = useAppContext();
  
  const [name, setName] = useState('');
  const [type, setType] = useState('Fondos Indexados');
  const [where, setWhere] = useState('');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [qty, setQty] = useState('');
  const [restFromBalance, setRestFromBalance] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setType('Fondos Indexados');
      setWhere('');
      setDate(new Date().toISOString().split('T')[0]);
      setAmount('');
      setBuyPrice('');
      setQty('');
      setRestFromBalance(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const numAmount = parseFloat(amount) || 0;
    const numPrice = parseFloat(buyPrice) || 0;
    if (numAmount > 0 && numPrice > 0) {
      setQty((numAmount / numPrice).toFixed(6));
    } else {
      setQty('');
    }
  }, [amount, buyPrice]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const numAmount = parseFloat(amount) || 0;
    const numBuyPrice = parseFloat(buyPrice) || 0;
    const numQty = parseFloat(qty) || (numBuyPrice > 0 ? numAmount / numBuyPrice : 0);
    const finalName = name.trim();

    if (!finalName || numAmount <= 0) {
      alert("Por favor rellena el nombre del activo y el capital invertido.");
      return;
    }

    const newInv = {
      id: uid(),
      name: finalName,
      type,
      where: where.trim() || "Desconocido",
      date: date || new Date().toISOString().split('T')[0],
      amount: numAmount,
      buyPrice: numBuyPrice,
      quantity: numQty,
      currentValue: numAmount,
      currentPrice: numBuyPrice || numAmount,
      isCrypto: false
    };

    const newState = { ...state };
    newState.investments = [...(newState.investments || []), newInv];

    if (restFromBalance) {
      if (newState.mergeAccounts) {
        newState.balance = (newState.balance || 0) - numAmount;
        if (newState.savings) newState.savings.amount = (newState.savings.amount || 0) - numAmount;
      } else {
        newState.balance = (newState.balance || 0) - numAmount;
      }
    }

    const ok = await saveState(newState);
    if (ok) onClose();
  };

  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-[4px] z-[100] flex items-end justify-center" onClick={onClose}>
      <div 
        className="bg-[var(--paper)] w-full max-h-[85%] rounded-t-[24px] flex flex-col border-t border-[var(--paper-line)] animate-[fade_0.3s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Fija */}
        <div className="px-6 py-5 border-b border-[var(--paper-line)] shrink-0 flex justify-between items-center">
          <h3 className="font-['Playfair_Display'] text-[19px] font-bold m-0 text-[var(--ink)]">Añadir inversión / activo</h3>
          <button onClick={onClose} className="text-[20px] leading-none text-[var(--text-soft)] bg-transparent border-none cursor-pointer p-1">×</button>
        </div>

        {/* Cuerpo con Scroll interno */}
        <div className="p-6 overflow-y-auto pb-10">
          
          <div className="mb-4">
            <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">Nombre del activo</label>
            <input 
              type="text" 
              placeholder="Ej. Fondo Indexado, Bitcoin..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)]"
            />
          </div>

          <div className="mb-4">
            <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">Tipo de activo / Categoría</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value)}
              className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)]"
            >
              <option value="Fondos Indexados">Fondos Indexados</option>
              <option value="Criptomonedas">Criptomonedas</option>
              <option value="Acciones">Acciones</option>
              <option value="Planes de Pensiones">Planes de Pensiones</option>
              <option value="Otros">Otros</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">¿Dónde está depositado? / Bróker</label>
            <input 
              type="text" 
              placeholder="Ej. Trade Republic, MyInvestor..."
              value={where} 
              onChange={(e) => setWhere(e.target.value)}
              className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)]"
            />
          </div>

          <div className="mb-5">
            <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">Fecha de compra</label>
            <input 
              type="date"
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)] [color-scheme:dark]"
            />
          </div>

          <div className="bg-[rgba(244,197,99,0.02)] border border-[var(--paper-line)] rounded-[12px] p-4 mb-4">
            <div className="mb-4">
              <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">Capital invertido (€)</label>
              <input 
                type="number" step="0.01" placeholder="0.00"
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)]"
              />
            </div>
            <div className="mb-4">
              <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">Precio de compra (€/ud)</label>
              <input 
                type="number" step="0.01" placeholder="0.00"
                value={buyPrice} 
                onChange={(e) => setBuyPrice(e.target.value)}
                className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)]"
              />
            </div>
            <div>
              <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">Unidades obtenidas (Calculado)</label>
              <input 
                type="text" placeholder="Se calculará solo..." readOnly
                value={qty}
                className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[rgba(255,255,255,0.03)] text-[var(--text-soft)] text-[14px] outline-none cursor-not-allowed"
              />
            </div>
          </div>

          <div className="bg-[rgba(244,197,99,0.05)] border border-[rgba(244,197,99,0.15)] rounded-[12px] p-4 mb-6 flex items-center gap-3">
            <input 
              type="checkbox" id="chkInvRest"
              checked={restFromBalance} 
              onChange={(e) => setRestFromBalance(e.target.checked)}
              className="w-4 h-4 accent-[var(--gold)] cursor-pointer shrink-0" 
            />
            <label htmlFor="chkInvRest" className="cursor-pointer text-[13px] font-semibold text-[var(--gold)]">
              Restar del saldo en cuenta ahora
            </label>
          </div>

          <button 
            onClick={handleSave}
            className="w-full bg-[var(--gold)] text-[#0D0D12] font-semibold text-[14px] p-3 rounded-[10px] border-none cursor-pointer active:scale-95 transition-transform"
          >
            Crear y guardar activo
          </button>

        </div>
      </div>
    </div>
  );
}