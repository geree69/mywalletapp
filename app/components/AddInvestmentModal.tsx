'use client';

import { useState } from 'react';
import { useAppContext } from '../context/AppContext';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export default function AddInvestmentModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { state, saveState } = useAppContext();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Fondos Indexados');
  const [broker, setBroker] = useState('');
  const [amountInvested, setAmountInvested] = useState(''); 
  const [buyPrice, setBuyPrice] = useState(''); 
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  if (!isOpen) return null;

  const accounts = state.accounts || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amountInvested || !buyPrice) return alert("Por favor, rellena los campos obligatorios.");

    const totalCost = parseFloat(amountInvested.replace(',', '.')) || 0;
    const price = parseFloat(buyPrice.replace(',', '.')) || 0;
    
    if (totalCost <= 0 || price <= 0) return alert("El importe y el precio deben ser mayores que 0.");

    // Calculamos cuántos títulos o acciones has comprado en esta aportación
    const numShares = totalCost / price;

    let updatedInvestments = state.investments ? [...state.investments] : [];
    
    // LA MAGIA: Buscamos si ya tienes una inversión con exactamente el mismo nombre (sin importar mayúsculas)
    const existingIndex = updatedInvestments.findIndex(
      inv => inv.name.trim().toLowerCase() === name.trim().toLowerCase()
    );

    if (existingIndex >= 0) {
      // SI YA EXISTE: Promediamos y sumamos
      const existingInv = updatedInvestments[existingIndex];
      
      const oldShares = Number(existingInv.shares) || 0;
      const oldBuyPrice = Number(existingInv.buyPrice) || 0;
      const oldTotalInvested = oldShares * oldBuyPrice;
      
      const newTotalShares = oldShares + numShares;
      const newTotalInvested = oldTotalInvested + totalCost;
      const newAvgBuyPrice = newTotalInvested / newTotalShares;

      updatedInvestments[existingIndex] = {
        ...existingInv,
        shares: newTotalShares,
        buyPrice: newAvgBuyPrice,
        // Mantenemos el precio actual que tenías puesto en el panel para que no lo tengas que volver a escribir
        currentPrice: existingInv.currentPrice || price,
        date: date // Actualizamos la fecha a la última aportación
      };
    } else {
      // SI NO EXISTE: La creamos nueva
      const newInv = {
        id: uid(),
        name: name.trim(),
        category,
        broker: broker.trim(),
        shares: numShares,
        buyPrice: price,
        currentPrice: price,
        date,
        accountId: selectedAccountId
      };
      updatedInvestments.push(newInv);
    }

    let updatedAccounts = [...accounts];
    let updatedTransactions = state.transactions ? [...state.transactions] : [];

    if (selectedAccountId) {
      updatedAccounts = updatedAccounts.map((acc: any) => {
        if (String(acc.id) === String(selectedAccountId)) {
          return { ...acc, balance: (Number(acc.balance) || 0) - totalCost };
        }
        return acc;
      });

      // El historial contable sí guarda esta compra individual de forma correcta
      updatedTransactions.push({
        id: uid(),
        title: `Inversión: ${name.trim()}`,
        amount: -totalCost, 
        type: 'expense', 
        accountId: selectedAccountId,
        date,
        category: 'Inversión'
      });
    }

    const calculatedGlobalBalance = updatedAccounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);

    const newState = {
      ...state,
      balance: calculatedGlobalBalance, 
      investments: updatedInvestments,
      accounts: updatedAccounts,
      transactions: updatedTransactions
    };

    const ok = await saveState(newState);
    if (ok) {
      setName('');
      setCategory('Fondos Indexados');
      setBroker('');
      setAmountInvested('');
      setBuyPrice('');
      setSelectedAccountId('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] w-full max-w-md p-5 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-[var(--paper-line)] pb-3">
          <h3 className="font-['Playfair_Display'] text-[16px] font-semibold text-[var(--ink)] m-0">Añadir Inversión</h3>
          <button onClick={onClose} className="text-[var(--text-soft)] hover:text-[var(--ink)] bg-transparent border-none text-[16px] cursor-pointer">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] text-[var(--text-soft)] mb-1 font-medium">Activo / Empresa / Criptomoneda</label>
            <input type="text" placeholder="Ej. Bitcoin, S&P 500, Apple..." value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2.5 rounded-[8px] border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] text-[13px] outline-none focus:border-[var(--gold)]" />
          </div>

          <div>
            <label className="block text-[11px] text-[var(--text-soft)] mb-1 font-medium">Categoría</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2.5 rounded-[8px] border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] text-[13px] outline-none focus:border-[var(--gold)] cursor-pointer">
              <option value="Fondos Indexados">Fondos Indexados</option>
              <option value="Criptomonedas">Criptomonedas</option>
              <option value="Acciones">Acciones</option>
              <option value="ETFs">ETFs</option>
              <option value="Otros">Otros</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-[var(--text-soft)] mb-1 font-medium">Bróker (opcional)</label>
              <input type="text" placeholder="Ej. Degiro, MyInvestor..." value={broker} onChange={(e) => setBroker(e.target.value)} className="w-full p-2.5 rounded-[8px] border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] text-[13px] outline-none focus:border-[var(--gold)]" />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--text-soft)] mb-1 font-medium">Fecha</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2.5 rounded-[8px] border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] text-[13px] outline-none focus:border-[var(--gold)] font-['IBM_Plex_Mono']" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-[var(--text-soft)] mb-1 font-medium">Total invertido (€)</label>
              <input type="number" step="any" placeholder="Ej. 100 o 1000" value={amountInvested} onChange={(e) => setAmountInvested(e.target.value)} className="w-full p-2.5 rounded-[8px] border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] text-[13px] font-['IBM_Plex_Mono'] outline-none focus:border-[var(--gold)]" />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--text-soft)] mb-1 font-medium">Precio de compra (€/ud)</label>
              <input type="number" step="any" placeholder="Ej. 50.00" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} className="w-full p-2.5 rounded-[8px] border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] text-[13px] font-['IBM_Plex_Mono'] outline-none focus:border-[var(--gold)]" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-[var(--text-soft)] mb-1 font-medium">Restar dinero de cuenta (opcional)</label>
            <select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} className="w-full p-2.5 rounded-[8px] border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] text-[13px] outline-none focus:border-[var(--gold)] cursor-pointer">
              <option value="">No descontar de ninguna cuenta</option>
              {accounts.map((acc: any) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} — {Number(acc.balance || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-transparent border border-[var(--paper-line)] text-[var(--ink)] font-semibold text-[13px] p-2.5 rounded-[8px] cursor-pointer">Cancelar</button>
            <button type="submit" className="flex-1 bg-[var(--gold)] text-[#0D0D12] font-semibold text-[13px] p-2.5 rounded-[8px] cursor-pointer border-none shadow-sm">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
}