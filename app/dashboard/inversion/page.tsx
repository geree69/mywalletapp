'use client';

import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';

const fmt = (n: number) => {
  const v = Number(n) || 0;
  return v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
};

export default function InversionPage() {
  const { state, saveState } = useAppContext();
  const investments = state.investments || [];
  const accounts = state.accounts || [];

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Fondos Indexados');
  const [customCategory, setCustomCategory] = useState('');
  const [broker, setBroker] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');

  // Estado para modal de venta rápida desde el botón de la tarjeta
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellingInv, setSellingInv] = useState<any>(null);
  const [sellPrice, setSellPrice] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) return;

    const finalCategory = category === 'Otros' ? (customCategory.trim() || 'Otros') : category;
    const totalInv = Number(amount) || 0;
    const pUnit = Number(pricePerUnit) || 0;
    const qty = pUnit > 0 ? totalInv / pUnit : 0;

    const newInv = {
      id: Date.now().toString(),
      name: name.trim(),
      category: finalCategory,
      broker: broker.trim() || 'Principal',
      buyPrice: totalInv,
      pricePerUnit: pUnit,
      quantity: qty,
      currentPricePerUnit: pUnit,
      date: date || new Date().toISOString().split('T')[0],
    };

    let updatedAccounts = [...accounts];
    if (selectedAccountId) {
      updatedAccounts = updatedAccounts.map((acc: any) => {
        if (acc.id === selectedAccountId) {
          return { ...acc, balance: Number(acc.balance || 0) - totalInv };
        }
        return acc;
      });
    }

    const newState = {
      ...state,
      investments: [...investments, newInv],
      accounts: updatedAccounts,
    };

    await saveState(newState);
    setName('');
    setCategory('Fondos Indexados');
    setCustomCategory('');
    setBroker('');
    setDate(new Date().toISOString().split('T')[0]);
    setAmount('');
    setPricePerUnit('');
    setSelectedAccountId('');
    setShowModal(false);
  };

  const handleUpdateCurrentPrice = async (id: string, newCurrPrice: number) => {
    const updated = investments.map((inv: any) => {
      if (inv.id === id) {
        return { ...inv, currentPricePerUnit: newCurrPrice };
      }
      return inv;
    });
    await saveState({ ...state, investments: updated });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Borrar esta inversión?')) return;
    const updated = investments.filter((i: any) => i.id !== id);
    await saveState({ ...state, investments: updated });
  };

  const handleSellSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellingInv || !sellPrice) return;

    const soldRecord = {
      id: Date.now().toString(),
      name: sellingInv.name,
      broker: sellingInv.broker,
      buyPrice: sellingInv.buyPrice,
      sellPrice: Number(sellPrice) || 0,
      date: new Date().toISOString().split('T')[0],
    };

    const updatedInvestments = investments.filter((i: any) => i.id !== sellingInv.id);
    const updatedSold = [soldRecord, ...(state.soldInvestments || [])];

    await saveState({
      ...state,
      investments: updatedInvestments,
      soldInvestments: updatedSold,
    });

    setShowSellModal(false);
    setSellingInv(null);
    setSellPrice('');
  };

  // Cálculos totales
  const totalInverted = investments.reduce((acc: number, i: any) => acc + Number(i.buyPrice || 0), 0);
  const totalCurrentValue = investments.reduce((acc: number, i: any) => {
    const qty = Number(i.quantity || 0);
    const currP = i.currentPricePerUnit !== undefined ? Number(i.currentPricePerUnit) : Number(i.pricePerUnit || 0);
    return acc + (qty > 0 ? qty * currP : Number(i.buyPrice || 0));
  }, 0);

  const totalProfit = totalCurrentValue - totalInverted;
  // Redondeo seguro para evitar que 0 se interprete como negativo en colores por decimales microscópicos
  const safeTotalProfit = Math.round(totalProfit * 100) / 100;
  const totalProfitPercent = totalInverted > 0 ? (totalProfit / totalInverted) * 100 : 0;

  // Agrupar por categoría
  const grouped: Record<string, any[]> = {};
  investments.forEach((i: any) => {
    const cat = i.category || 'Otros';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(i);
  });

  return (
    <div className="flex flex-col space-y-4 pb-6">
      <div>
        <h2 className="font-['Playfair_Display'] text-[20px] font-semibold m-0 mb-1 text-[var(--ink)] tracking-wide">
          Inversiones
        </h2>
        <p className="text-[12px] text-[var(--text-soft)] m-0 leading-relaxed">
          Tus activos invertidos y su rendimiento actual.
        </p>
      </div>

      {/* Tarjetas superiores */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-3.5">
          <p className="text-[11px] text-[var(--text-soft)] m-0 mb-1 uppercase tracking-wider">Invertido</p>
          <p className="text-[18px] font-semibold text-[var(--ink)] m-0">
            {fmt(totalInverted)}
          </p>
        </div>
        <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-3.5">
          <p className="text-[11px] text-[var(--text-soft)] m-0 mb-1 uppercase tracking-wider">Valor actual</p>
          <p className="text-[18px] font-semibold text-[var(--teal-d)] m-0">
            {fmt(totalCurrentValue)}
          </p>
        </div>
      </div>

      {/* Tarjeta de rentabilidad total */}
      <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-3.5 text-center">
        <p className="text-[11px] text-[var(--text-soft)] m-0 mb-1">Rentabilidad total:</p>
        <p className={`text-[16px] font-semibold m-0 ${safeTotalProfit >= 0 ? 'text-[var(--teal-d)]' : 'text-[var(--coral)]'}`}>
          {safeTotalProfit > 0 ? '+' : ''}{fmt(totalProfit)} ({totalProfitPercent >= 0 ? '+' : ''}{totalProfitPercent.toFixed(1)}%)
        </p>
      </div>

      {/* Listado agrupado por categorías */}
      {Object.keys(grouped).length === 0 ? (
        <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-6 text-center text-[var(--text-soft)] text-[13px]">
          No tienes inversiones registradas.
        </div>
      ) : (
        Object.entries(grouped).map(([categoryName, items]) => {
          const catInverted = items.reduce((acc, i) => acc + Number(i.buyPrice || 0), 0);
          const catCurrent = items.reduce((acc, i) => {
            const q = Number(i.quantity || 0);
            const cp = i.currentPricePerUnit !== undefined ? Number(i.currentPricePerUnit) : Number(i.pricePerUnit || 0);
            return acc + (q > 0 ? q * cp : Number(i.buyPrice || 0));
          }, 0);
          const catProfit = catCurrent - catInverted;
          const safeCatProfit = Math.round(catProfit * 100) / 100;
          const catPct = catInverted > 0 ? (catProfit / catInverted) * 100 : 0;

          return (
            <div key={categoryName} className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[14px] text-[var(--ink)]">{categoryName}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-[6px] font-semibold ${safeCatProfit >= 0 ? 'bg-[rgba(42,157,143,0.15)] text-[var(--teal-d)]' : 'bg-[rgba(235,110,93,0.15)] text-[var(--coral)]'}`}>
                    {safeCatProfit > 0 ? '+' : ''}{catPct.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-[var(--ink)]">
                    {fmt(catCurrent)}
                  </span>
                  <span className="text-[10px] text-[var(--text-soft)]">▲</span>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-[var(--paper-line)]">
                {items.map((inv: any) => {
                  const currP = inv.currentPricePerUnit !== undefined ? Number(inv.currentPricePerUnit) : Number(inv.pricePerUnit || 0);
                  const itemVal = Number(inv.quantity || 0) > 0 ? Number(inv.quantity) * currP : Number(inv.buyPrice);
                  const itemProfit = itemVal - Number(inv.buyPrice);
                  const safeItemProfit = Math.round(itemProfit * 100) / 100;
                  const itemPct = Number(inv.buyPrice) > 0 ? (itemProfit / Number(inv.buyPrice)) * 100 : 0;
                  
                  const qtyNumber = Number(inv.quantity);
                  const displayQty = Number.isNaN(qtyNumber) ? 'NaN' : qtyNumber.toFixed(6);

                  return (
                    <div key={inv.id} className="bg-[var(--paper)] border border-[var(--paper-line)] rounded-[12px] p-3 space-y-2.5">
                      
                      {/* Top line de la inversión */}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[13px] text-[var(--ink)]">{inv.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-[4px] font-semibold ${safeItemProfit >= 0 ? 'bg-[rgba(42,157,143,0.15)] text-[var(--teal-d)]' : 'bg-[rgba(235,110,93,0.15)] text-[var(--coral)]'}`}>
                            {safeItemProfit > 0 ? '+' : ''}{itemPct.toFixed(1)}%
                          </span>
                        </div>
                        <span className="text-[13px] font-semibold text-[var(--ink)]">{fmt(itemVal)}</span>
                      </div>

                      {/* Detalles a la izquierda y botones Vender/Eliminar a la derecha centrados */}
                      <div className="flex justify-between items-center">
                        <div className="text-[10px] text-[var(--text-soft)] space-y-0.5">
                          <p className="m-0">Bróker: {inv.broker} • {inv.date}</p>
                          <p className="m-0">Invertido: {fmt(inv.buyPrice)} • Compra: {fmt(inv.pricePerUnit)}/ud</p>
                          <p className="m-0">(Tienes {displayQty} ud)</p>
                        </div>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => { setSellingInv(inv); setSellPrice(itemVal.toFixed(2)); setShowSellModal(true); }}
                            className="px-2.5 py-1 bg-[var(--paper-2)] border border-[var(--paper-line)] text-[var(--teal-d)] font-semibold text-[11px] rounded-[8px] cursor-pointer hover:border-[var(--teal-d)] transition-colors"
                          >
                            Vender
                          </button>
                          <button 
                            onClick={() => handleDelete(inv.id)}
                            className="w-7 h-7 flex items-center justify-center text-[var(--text-soft)] hover:text-[var(--coral)] bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[8px] cursor-pointer text-[14px]"
                            title="Eliminar"
                          >
                            ×
                          </button>
                        </div>
                      </div>

                      {/* Precio actual unitario (Input) */}
                      <div className="flex items-center justify-between pt-2 border-t border-[var(--paper-line)] text-[11px]">
                        <span className="text-[var(--text-soft)]">Precio actual unitario (€):</span>
                        <input 
                          type="number"
                          step="0.0001"
                          value={inv.currentPricePerUnit !== undefined ? inv.currentPricePerUnit : inv.pricePerUnit}
                          onChange={(e) => handleUpdateCurrentPrice(inv.id, Number(e.target.value))}
                          className="w-24 p-1.5 rounded-[8px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[12px] text-right outline-none focus:border-[var(--gold)]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Botón grande inferior */}
      <button
        onClick={() => setShowModal(true)}
        className="w-full py-3.5 bg-[var(--gold)] text-[#0D0D12] font-semibold text-[13px] rounded-[var(--radius)] border-none cursor-pointer hover:opacity-95 transition-opacity shadow-sm"
      >
        + Añadir inversión
      </button>

      {/* Modal Añadir Inversión */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[380px] bg-[var(--paper)] border border-[var(--paper-line)] rounded-[20px] p-5 shadow-2xl flex flex-col space-y-3">
            
            <div className="flex justify-between items-center border-b border-[var(--paper-line)] pb-2">
              <h3 className="font-['Playfair_Display'] text-[16px] font-semibold text-[var(--ink)] m-0">Añadir Inversión</h3>
              <button onClick={() => setShowModal(false)} className="bg-transparent border-none text-[var(--text-soft)] text-[16px] cursor-pointer">×</button>
            </div>

            <form onSubmit={handleAdd} className="flex flex-col space-y-3 pt-1">
              <div>
                <label className="block text-[11px] text-[var(--text-soft)] mb-1">Activo / Empresa / Criptomonedas</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej. Bitcoin, S&P 500, Apple..." 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[12px] outline-none focus:border-[var(--gold)]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[var(--text-soft)] mb-1">Categoría</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[12px] outline-none focus:border-[var(--gold)]"
                >
                  <option value="Fondos Indexados" className="bg-[#121218] text-white">Fondos Indexados</option>
                  <option value="Criptomonedas" className="bg-[#121218] text-white">Criptomonedas</option>
                  <option value="Acciones" className="bg-[#121218] text-white">Acciones</option>
                  <option value="ETFs" className="bg-[#121218] text-white">ETFs</option>
                  <option value="Otros" className="bg-[#121218] text-white">Otros</option>
                </select>
              </div>

              {category === 'Otros' && (
                <div>
                  <label className="block text-[11px] text-[var(--text-soft)] mb-1">Especifica la categoría</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ej. Inmobiliario, Bonos, etc." 
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full p-2.5 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[12px] outline-none focus:border-[var(--gold)]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-[var(--text-soft)] mb-1">Bróker (opcional)</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Degiro, MyInvestor..." 
                    value={broker}
                    onChange={(e) => setBroker(e.target.value)}
                    className="w-full p-2.5 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[12px] outline-none focus:border-[var(--gold)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--text-soft)] mb-1">Fecha</label>
                  <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2.5 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[12px] outline-none focus:border-[var(--gold)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-[var(--text-soft)] mb-1">Total invertido (€)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    placeholder="Ej. 100 o 1000" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-2.5 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[12px] outline-none focus:border-[var(--gold)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--text-soft)] mb-1">Precio de compra (€/ud)</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    required
                    placeholder="Ej. 50.00" 
                    value={pricePerUnit}
                    onChange={(e) => setPricePerUnit(e.target.value)}
                    className="w-full p-2.5 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[12px] outline-none focus:border-[var(--gold)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[var(--text-soft)] mb-1">Restar dinero de cuenta (opcional)</label>
                <select 
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full p-2.5 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[12px] outline-none focus:border-[var(--gold)]"
                >
                  <option value="" className="bg-[#121218] text-white">No descontar de ninguna cuenta</option>
                  {accounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id} className="bg-[#121218] text-white">{acc.name} ({fmt(acc.balance)})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="w-full py-2.5 bg-[var(--paper-2)] border border-[var(--paper-line)] text-[var(--ink)] font-semibold text-[12px] rounded-[10px] cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="w-full py-2.5 bg-[var(--gold)] text-[#0D0D12] font-semibold text-[12px] rounded-[10px] border-none cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Modal Vender Activo */}
      {showSellModal && sellingInv && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[340px] bg-[var(--paper)] border border-[var(--paper-line)] rounded-[20px] p-5 shadow-2xl flex flex-col space-y-3">
            <div className="flex justify-between items-center border-b border-[var(--paper-line)] pb-2">
              <h3 className="font-['Playfair_Display'] text-[16px] font-semibold text-[var(--ink)] m-0">Vender {sellingInv.name}</h3>
              <button onClick={() => setShowSellModal(false)} className="bg-transparent border-none text-[var(--text-soft)] text-[16px] cursor-pointer">×</button>
            </div>
            <form onSubmit={handleSellSubmit} className="flex flex-col space-y-3 pt-1">
              <div>
                <label className="block text-[11px] text-[var(--text-soft)] mb-1">Precio total de venta (€)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  className="w-full p-2.5 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[12px] outline-none focus:border-[var(--gold)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowSellModal(false)}
                  className="w-full py-2.5 bg-[var(--paper-2)] border border-[var(--paper-line)] text-[var(--ink)] font-semibold text-[12px] rounded-[10px] cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="w-full py-2.5 bg-[var(--gold)] text-[#0D0D12] font-semibold text-[12px] rounded-[10px] border-none cursor-pointer"
                >
                  Confirmar Venta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}