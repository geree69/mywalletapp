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

  // Estados para modal de VENTA
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellingInv, setSellingInv] = useState<any>(null);
  const [sellUnits, setSellUnits] = useState('');
  const [sellPricePerUnit, setSellPricePerUnit] = useState('');
  const [sellDestination, setSellDestination] = useState<'broker' | 'account'>(accounts.length > 0 ? 'account' : 'broker');
  const [sellAccountId, setSellAccountId] = useState(accounts.length > 0 ? accounts[0].id : '');

  // Estados para modal de TRASPASO DE LIQUIDEZ desde el Bróker
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferItem, setTransferItem] = useState<any>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferAccountId, setTransferAccountId] = useState(accounts.length > 0 ? accounts[0].id : '');

  // Estado para desplegables de categorías
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => ({ ...prev, [cat]: prev[cat] === false ? true : false }));
  };

  const isCategoryOpen = (cat: string) => openCategories[cat] !== false;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) return;

    const finalCategory = category === 'Otros' ? (customCategory.trim() || 'Otros') : category;
    const totalInv = Number(amount) || 0;
    const pUnit = Number(pricePerUnit) || 0;
    const qty = pUnit > 0 ? totalInv / pUnit : 0;
    const invDate = date || new Date().toISOString().split('T')[0];

    const newInv = {
      id: Date.now().toString(),
      name: name.trim(),
      category: finalCategory,
      broker: broker.trim() || 'Principal',
      buyPrice: totalInv,
      pricePerUnit: pUnit,
      quantity: qty,
      currentPricePerUnit: pUnit,
      date: invDate,
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

    // ✅ NUEVO: Movimiento automático en la app para que aparezca como gasto/inversión en el historial
    const newTransaction = {
      id: Date.now().toString() + '-buy-tx',
      type: 'expense',
      amount: totalInv,
      date: invDate,
      title: `Inversión en ${name.trim()}`,
      category: 'Inversión',
      isRecurring: false,
      split: false,
      accountId: selectedAccountId || ''
    };
    const updatedTransactions = [...(state.transactions || []), newTransaction];

    const newGlobalBalance = updatedAccounts.reduce((sum: number, acc: any) => {
      if (acc.excludeFromTotal) return sum;
      return sum + Number(acc.balance || 0);
    }, 0);

    const newState = {
      ...state,
      investments: [...investments, newInv],
      accounts: updatedAccounts,
      transactions: updatedTransactions,
      balance: newGlobalBalance,
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

  const handleUpdateCurrentPrice = async (ids: string[], newCurrPrice: string) => {
    const updated = investments.map((inv: any) => {
      if (ids.includes(inv.id)) {
        return { ...inv, currentPricePerUnit: newCurrPrice };
      }
      return inv;
    });
    await saveState({ ...state, investments: updated });
  };

  const handleDelete = async (ids: string[]) => {
    if (!confirm('¿Borrar esta inversión y todas sus compras asociadas?')) return;
    const updated = investments.filter((i: any) => !ids.includes(i.id));
    await saveState({ ...state, investments: updated });
  };

  const handleSellSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellingInv || !sellPricePerUnit || !sellUnits) return;

    const unitsToSell = Number(sellUnits);
    const price = Number(sellPricePerUnit);

    if (unitsToSell <= 0 || price < 0 || unitsToSell > sellingInv.quantity) {
      alert("Por favor, revisa las unidades a vender. No pueden ser mayores a las que posees.");
      return;
    }

    const totalSaleValue = unitsToSell * price;
    let remainingUnitsToSell = unitsToSell;
    let updatedInvestments = [...investments];

    updatedInvestments = updatedInvestments.map(i => {
      if (sellingInv.ids.includes(i.id) && remainingUnitsToSell > 0) {
        if (i.quantity <= remainingUnitsToSell) {
          remainingUnitsToSell -= i.quantity;
          return { ...i, quantity: 0, buyPrice: 0 };
        } else {
          const newQty = i.quantity - remainingUnitsToSell;
          const newBuyPrice = (i.buyPrice / i.quantity) * newQty;
          remainingUnitsToSell = 0;
          return { ...i, quantity: newQty, buyPrice: newBuyPrice };
        }
      }
      return i;
    }).filter(i => !sellingInv.ids.includes(i.id) || i.quantity > 0.000001);

    let updatedAccounts = [...accounts];
    if (sellDestination === 'account' && sellAccountId) {
      updatedAccounts = updatedAccounts.map(acc => {
        if (acc.id === sellAccountId) {
          return { ...acc, balance: Number(acc.balance || 0) + totalSaleValue };
        }
        return acc;
      });
    } else {
      const brokerName = sellingInv.broker.split(',')[0].trim() || 'General';
      const liqName = `Liquidez (${brokerName})`;
      
      const existingLiqIndex = updatedInvestments.findIndex(i => i.name === liqName && i.category === 'Efectivo');
      if (existingLiqIndex >= 0) {
        const ex = updatedInvestments[existingLiqIndex];
        updatedInvestments[existingLiqIndex] = {
          ...ex,
          buyPrice: Number(ex.buyPrice) + totalSaleValue,
          quantity: Number(ex.quantity) + totalSaleValue,
        };
      } else {
        updatedInvestments.push({
          id: Date.now().toString() + '-liq',
          name: liqName,
          category: 'Efectivo',
          broker: brokerName,
          buyPrice: totalSaleValue,
          pricePerUnit: 1,
          quantity: totalSaleValue,
          currentPricePerUnit: 1,
          date: new Date().toISOString().split('T')[0]
        });
      }
    }

    const soldRecord = {
      id: Date.now().toString(),
      name: sellingInv.name,
      broker: sellingInv.broker,
      buyPrice: (sellingInv.buyPrice / sellingInv.quantity) * unitsToSell, 
      sellPrice: totalSaleValue,
      soldUnits: unitsToSell,
      date: new Date().toISOString().split('T')[0],
    };
    const updatedSold = [soldRecord, ...(state.soldInvestments || [])];

    const newTransaction = {
      id: Date.now().toString() + '-tx',
      type: 'income',
      amount: totalSaleValue,
      date: new Date().toISOString().split('T')[0],
      title: `Venta de ${sellingInv.name}`,
      category: 'Venta de Inversiones',
      isRecurring: false,
      split: false,
      accountId: sellDestination === 'account' ? sellAccountId : ''
    };
    const updatedTransactions = [...(state.transactions || []), newTransaction];

    const newGlobalBalance = updatedAccounts.reduce((sum: number, acc: any) => {
      if (acc.excludeFromTotal) return sum;
      return sum + Number(acc.balance || 0);
    }, 0);

    await saveState({
      ...state,
      investments: updatedInvestments,
      accounts: updatedAccounts,
      soldInvestments: updatedSold,
      transactions: updatedTransactions,
      balance: newGlobalBalance,
    });

    setShowSellModal(false);
    setSellingInv(null);
    setSellPricePerUnit('');
    setSellUnits('');
    setSellDestination(accounts.length > 0 ? 'account' : 'broker');
    setSellAccountId(accounts.length > 0 ? accounts[0].id : '');
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferItem || !transferAmount || !transferAccountId) return;

    const amountToTransfer = Number(transferAmount);
    const maxAvailable = Number(transferItem.quantity || 0);

    if (amountToTransfer <= 0 || amountToTransfer > maxAvailable) {
      alert("El importe a traspasar no es válido o supera la liquidez disponible.");
      return;
    }

    let updatedInvestments = [...investments];
    let updatedAccounts = [...accounts];

    updatedInvestments = updatedInvestments.map(i => {
      if (transferItem.ids.includes(i.id)) {
        const newQty = Math.max(0, Number(i.quantity || 0) - amountToTransfer);
        return { ...i, quantity: newQty, buyPrice: newQty };
      }
      return i;
    }).filter(i => Number(i.quantity || 0) > 0.000001);

    updatedAccounts = updatedAccounts.map(acc => {
      if (acc.id === transferAccountId) {
        return { ...acc, balance: Number(acc.balance || 0) + amountToTransfer };
      }
      return acc;
    });

    const newTransaction = {
      id: Date.now().toString() + '-transfer',
      type: 'income',
      amount: amountToTransfer,
      date: new Date().toISOString().split('T')[0],
      title: `Traspaso desde ${transferItem.broker}`,
      category: 'Traspaso de Inversión',
      isRecurring: false,
      split: false,
      accountId: transferAccountId
    };
    const updatedTransactions = [...(state.transactions || []), newTransaction];

    const newGlobalBalance = updatedAccounts.reduce((sum: number, acc: any) => {
      if (acc.excludeFromTotal) return sum;
      return sum + Number(acc.balance || 0);
    }, 0);

    await saveState({
      ...state,
      investments: updatedInvestments,
      accounts: updatedAccounts,
      transactions: updatedTransactions,
      balance: newGlobalBalance,
    });

    setShowTransferModal(false);
    setTransferItem(null);
    setTransferAmount('');
  };

  const consolidated = investments.reduce((acc: any, current: any) => {
    const name = (current.name || '').trim();
    const category = current.category || 'Otros';
    const key = `${name.toLowerCase()}-${category}`;
    
    if (!acc[key]) {
      acc[key] = { 
        ...current,
        name,
        category,
        broker: current.broker || 'Principal',
        ids: [current.id] 
      };
    } else {
      acc[key].buyPrice = Number(acc[key].buyPrice || 0) + Number(current.buyPrice || 0);
      acc[key].quantity = Number(acc[key].quantity || 0) + Number(current.quantity || 0);
      acc[key].pricePerUnit = acc[key].quantity > 0 ? acc[key].buyPrice / acc[key].quantity : 0;
      acc[key].ids.push(current.id);
      
      if (current.currentPricePerUnit !== undefined) {
        acc[key].currentPricePerUnit = current.currentPricePerUnit;
      }
      
      const currentBroker = current.broker || 'Principal';
      if (!acc[key].broker.includes(currentBroker)) {
        acc[key].broker += `, ${currentBroker}`;
      }
      
      if (acc[key].date !== current.date) {
        acc[key].date = 'Varias fechas';
      }
    }
    return acc;
  }, {});

  const mergedInvestments = Object.values(consolidated);

  const totalInverted = mergedInvestments.reduce((acc: number, i: any) => acc + Number(i.buyPrice || 0), 0);
  const totalCurrentValue = mergedInvestments.reduce((acc: number, i: any) => {
    const qty = Number(i.quantity || 0);
    const currP = i.currentPricePerUnit !== undefined ? Number(i.currentPricePerUnit) : Number(i.pricePerUnit || 0);
    return acc + (qty > 0 ? qty * currP : Number(i.buyPrice || 0));
  }, 0);

  const totalProfit = totalCurrentValue - totalInverted;
  const safeTotalProfit = Math.round(totalProfit * 100) / 100;
  const totalProfitPercent = totalInverted > 0 ? (totalProfit / totalInverted) * 100 : 0;

  const grouped: Record<string, any[]> = {};
  mergedInvestments.forEach((i: any) => {
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

      <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-3.5 text-center">
        <p className="text-[11px] text-[var(--text-soft)] m-0 mb-1">Rentabilidad total:</p>
        <p className={`text-[16px] font-semibold m-0 ${safeTotalProfit >= 0 ? 'text-[var(--teal-d)]' : 'text-[var(--coral)]'}`}>
          {safeTotalProfit > 0 ? '+' : ''}{fmt(totalProfit)} ({totalProfitPercent >= 0 ? '+' : ''}{totalProfitPercent.toFixed(1)}%)
        </p>
      </div>

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
            <div key={categoryName} className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-4 flex flex-col shadow-sm">
              <div 
                className="flex justify-between items-center cursor-pointer select-none"
                onClick={() => toggleCategory(categoryName)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[14px] text-[var(--ink)]">{categoryName}</span>
                  {categoryName !== 'Efectivo' && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-[6px] font-semibold ${safeCatProfit >= 0 ? 'bg-[rgba(42,157,143,0.15)] text-[var(--teal-d)]' : 'bg-[rgba(235,110,93,0.15)] text-[var(--coral)]'}`}>
                      {safeCatProfit > 0 ? '+' : ''}{catPct.toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-[var(--ink)]">
                    {fmt(catCurrent)}
                  </span>
                  <span className={`text-[10px] text-[var(--text-soft)] transition-transform duration-300 ${isCategoryOpen(categoryName) ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </div>
              </div>

              {isCategoryOpen(categoryName) && (
                <div className="space-y-3 pt-3 border-t border-[var(--paper-line)] mt-3">
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
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[13px] text-[var(--ink)]">
                              {inv.name}
                              {inv.ids.length > 1 && inv.category !== 'Efectivo' && <span className="text-[10px] text-[var(--text-soft)] ml-1.5 font-normal bg-[var(--paper-2)] px-1.5 py-0.5 rounded-[4px]">{inv.ids.length} compras</span>}
                            </span>
                            {inv.category !== 'Efectivo' && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-[4px] font-semibold ${safeItemProfit >= 0 ? 'bg-[rgba(42,157,143,0.15)] text-[var(--teal-d)]' : 'bg-[rgba(235,110,93,0.15)] text-[var(--coral)]'}`}>
                                {safeItemProfit > 0 ? '+' : ''}{itemPct.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          <span className="text-[13px] font-semibold text-[var(--ink)]">{fmt(itemVal)}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <div className="text-[10px] text-[var(--text-soft)] space-y-0.5">
                            <p className="m-0">Bróker: {inv.broker} • {inv.date}</p>
                            {inv.category !== 'Efectivo' && (
                              <p className="m-0">Invertido: {fmt(inv.buyPrice)} • Precio Medio: {fmt(inv.pricePerUnit)}/ud</p>
                            )}
                            {inv.category !== 'Efectivo' && <p className="m-0">(Tienes {displayQty} ud)</p>}
                          </div>
                          
                          <div className="flex items-center gap-1.5 shrink-0">
                            {inv.category === 'Efectivo' && accounts.length > 0 && (
                              <button
                                onClick={() => {
                                  setTransferItem(inv);
                                  setTransferAmount(inv.quantity.toString());
                                  setTransferAccountId(accounts[0].id);
                                  setShowTransferModal(true);
                                }}
                                className="px-2.5 py-1 bg-[var(--paper-2)] border border-[var(--paper-line)] text-[var(--gold)] font-semibold text-[11px] rounded-[8px] cursor-pointer hover:border-[var(--gold)] transition-colors"
                              >
                                Traspasar a cuenta
                              </button>
                            )}

                            {inv.category !== 'Efectivo' && (
                              <button
                                onClick={() => { 
                                  setSellingInv(inv); 
                                  setSellUnits(inv.quantity.toString());
                                  const currentP = inv.currentPricePerUnit !== undefined ? inv.currentPricePerUnit : inv.pricePerUnit;
                                  setSellPricePerUnit(currentP.toString()); 
                                  setShowSellModal(true); 
                                }}
                                className="px-2.5 py-1 bg-[var(--paper-2)] border border-[var(--paper-line)] text-[var(--teal-d)] font-semibold text-[11px] rounded-[8px] cursor-pointer hover:border-[var(--teal-d)] transition-colors"
                              >
                                Vender
                              </button>
                            )}
                            <button 
                              onClick={() => handleDelete(inv.ids)}
                              className="w-7 h-7 flex items-center justify-center text-[var(--text-soft)] hover:text-[var(--coral)] bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[8px] cursor-pointer text-[14px]"
                              title="Eliminar registro completo"
                            >
                              ×
                            </button>
                          </div>
                        </div>

                        {inv.category !== 'Efectivo' && (
                          <div className="flex items-center justify-between pt-2 border-t border-[var(--paper-line)] text-[11px]">
                            <span className="text-[var(--text-soft)]">Precio actual unitario (€):</span>
                            <input 
                              type="number"
                              step="0.0001"
                              value={inv.currentPricePerUnit !== undefined ? inv.currentPricePerUnit : inv.pricePerUnit}
                              onChange={(e) => handleUpdateCurrentPrice(inv.ids, e.target.value)}
                              className="w-24 p-1.5 rounded-[8px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[12px] text-right outline-none focus:border-[var(--gold)]"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}

      <button
        onClick={() => setShowModal(true)}
        className="w-full py-3.5 bg-[var(--gold)] text-[#0D0D12] font-semibold text-[13px] rounded-[var(--radius)] border-none cursor-pointer hover:opacity-95 transition-opacity shadow-sm mt-2"
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
                  <option value="Efectivo" className="bg-[#121218] text-white">Efectivo / Liquidez</option>
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-[var(--text-soft)] mb-1">Unidades a vender</label>
                  <input 
                    type="number" 
                    step="any"
                    max={sellingInv.quantity}
                    required
                    value={sellUnits}
                    onChange={(e) => setSellUnits(e.target.value)}
                    className="w-full p-2.5 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[12px] outline-none focus:border-[var(--gold)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--text-soft)] mb-1">Precio por unidad (€)</label>
                  <input 
                    type="number" 
                    step="any"
                    required
                    value={sellPricePerUnit}
                    onChange={(e) => setSellPricePerUnit(e.target.value)}
                    className="w-full p-2.5 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[12px] outline-none focus:border-[var(--gold)]"
                  />
                </div>
              </div>

              <div>
                 <label className="block text-[11px] text-[var(--text-soft)] mb-1">¿Qué hacer con el dinero de la venta?</label>
                 <select
                   value={sellDestination}
                   onChange={(e) => setSellDestination(e.target.value as 'broker' | 'account')}
                   className="w-full p-2.5 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[12px] outline-none focus:border-[var(--gold)]"
                 >
                   <option value="account" className="bg-[#121218] text-white">Sumarlo directamente a una cuenta</option>
                   <option value="broker" className="bg-[#121218] text-white">Guardarlo en Inversiones (Liquidez)</option>
                 </select>
              </div>

              {sellDestination === 'account' && (
                  <div className="animate-[fade_0.2s_ease]">
                    <label className="block text-[11px] text-[var(--text-soft)] mb-1">Selecciona la cuenta destino</label>
                    <select
                      required
                      value={sellAccountId}
                      onChange={(e) => setSellAccountId(e.target.value)}
                      className="w-full p-2.5 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[12px] outline-none focus:border-[var(--gold)]"
                    >
                      <option value="" disabled className="bg-[#121218] text-white">Elige una cuenta...</option>
                      {accounts.map((acc: any) => (
                        <option key={acc.id} value={acc.id} className="bg-[#121218] text-white">{acc.name} ({fmt(acc.balance)})</option>
                      ))}
                    </select>
                  </div>
              )}

              <div className="bg-[var(--paper-2)] p-3 rounded-[10px] border border-[var(--paper-line)] space-y-1.5 mt-2">
                <div className="flex justify-between text-[11px] text-[var(--text-soft)]">
                  <span>Unidades disponibles:</span>
                  <span className="text-[var(--ink)] font-medium">
                    {Number(sellingInv.quantity).toFixed(6)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[var(--paper-line)]">
                  <span className="text-[12px] text-[var(--text-soft)]">Total a recibir:</span>
                  <span className="text-[14px] text-[var(--gold)] font-semibold">
                    {fmt(Number(sellPricePerUnit || 0) * Number(sellUnits || 0))}
                  </span>
                </div>
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
                  className="w-full py-2.5 bg-[var(--gold)] text-[#0D0D12] font-semibold text-[12px] rounded-[10px] border-none cursor-pointer hover:opacity-95 transition-opacity"
                >
                  Confirmar Venta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Traspasar Liquidez a Cuenta */}
      {showTransferModal && transferItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[340px] bg-[var(--paper)] border border-[var(--paper-line)] rounded-[20px] p-5 shadow-2xl flex flex-col space-y-3">
            <div className="flex justify-between items-center border-b border-[var(--paper-line)] pb-2">
              <h3 className="font-['Playfair_Display'] text-[16px] font-semibold text-[var(--ink)] m-0">Traspasar a cuenta</h3>
              <button onClick={() => setShowTransferModal(false)} className="bg-transparent border-none text-[var(--text-soft)] text-[16px] cursor-pointer">×</button>
            </div>
            
            <form onSubmit={handleTransferSubmit} className="flex flex-col space-y-3 pt-1">
              <div>
                <label className="block text-[11px] text-[var(--text-soft)] mb-1">Importe a traspasar (€)</label>
                <input 
                  type="number" 
                  step="any"
                  max={transferItem.quantity}
                  required
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full p-2.5 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[12px] outline-none focus:border-[var(--gold)]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[var(--text-soft)] mb-1">Cuenta bancaria de destino</label>
                <select
                  required
                  value={transferAccountId}
                  onChange={(e) => setTransferAccountId(e.target.value)}
                  className="w-full p-2.5 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[12px] outline-none focus:border-[var(--gold)]"
                >
                  {accounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id} className="bg-[#121218] text-white">{acc.name} ({fmt(acc.balance)})</option>
                  ))}
                </select>
              </div>

              <div className="bg-[var(--paper-2)] p-3 rounded-[10px] border border-[var(--paper-line)] flex justify-between text-[11px] text-[var(--text-soft)] mt-1">
                <span>Disponible en {transferItem.broker}:</span>
                <span className="text-[var(--ink)] font-medium">{fmt(transferItem.quantity)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowTransferModal(false)}
                  className="w-full py-2.5 bg-[var(--paper-2)] border border-[var(--paper-line)] text-[var(--ink)] font-semibold text-[12px] rounded-[10px] cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="w-full py-2.5 bg-[var(--gold)] text-[#0D0D12] font-semibold text-[12px] rounded-[10px] border-none cursor-pointer hover:opacity-95 transition-opacity"
                >
                  Traspasar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}