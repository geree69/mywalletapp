'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

export default function BalanceModal({ isOpen, onClose, accountToEdit }: { isOpen: boolean, onClose: () => void, accountToEdit?: any }) {
  const { state, saveState } = useAppContext();
  const accounts = state.accounts || [];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [type, setType] = useState('bank'); 
  const [bankPurpose, setBankPurpose] = useState('both'); 
  
  const [cashCounts, setCashCounts] = useState<Record<number, string>>({});
  const [excludeFromTotal, setExcludeFromTotal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (accountToEdit) {
        setEditingId(accountToEdit.id);
        setName(accountToEdit.name);
        setType(accountToEdit.type || 'bank');
        setBalance(accountToEdit.balance.toString());
        setBankPurpose(accountToEdit.purpose || 'both');
        setExcludeFromTotal(accountToEdit.excludeFromTotal || false);
        setCashCounts(accountToEdit.cashCounts || {});
      } else {
        resetForm();
      }
    }
  }, [isOpen, accountToEdit]);

  if (!isOpen) return null;

  const BILLS = [500, 200, 100, 50, 20, 10, 5];
  const COINS = [2, 1, 0.50, 0.20, 0.10, 0.05, 0.02, 0.01];

  const cashTotal = Object.entries(cashCounts).reduce((sum, [val, count]) => {
    const numericVal = parseFloat(val);
    const numericCount = parseInt(count) || 0;
    return sum + (numericVal * 100 * numericCount);
  }, 0) / 100;

  const handleEditClick = (acc: any) => {
    setEditingId(acc.id);
    setName(acc.name);
    setType(acc.type || 'bank');
    setBalance(acc.balance.toString());
    setBankPurpose(acc.purpose || 'both');
    setExcludeFromTotal(acc.excludeFromTotal || false);
    setCashCounts(acc.cashCounts || {});
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setBalance('');
    setType('bank');
    setBankPurpose('both');
    setExcludeFromTotal(false);
    setCashCounts({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalBalance = type === 'cash' ? cashTotal : Number(balance);
    
    if (!name.trim()) return;
    if (type === 'bank' && !balance) return; 

    const savedAccount = {
      id: editingId || Date.now().toString(36),
      name: name.trim(),
      balance: finalBalance,
      type: type,
      purpose: type === 'bank' ? bankPurpose : 'cash',
      excludeFromTotal: type === 'cash' ? excludeFromTotal : false,
      cashCounts: type === 'cash' ? cashCounts : {} 
    };

    let updatedAccounts;
    if (editingId) {
      updatedAccounts = accounts.map((a: any) => a.id === editingId ? savedAccount : a);
    } else {
      updatedAccounts = [...accounts, savedAccount];
    }
    
    const newGlobalBalance = updatedAccounts.reduce((sum: number, acc: any) => {
      return acc.excludeFromTotal ? sum : sum + acc.balance;
    }, 0);

    const newState = {
      ...state,
      accounts: updatedAccounts,
      balance: newGlobalBalance
    };

    await saveState(newState);
    
    // ARREGLO AQUÍ: Ahora siempre cerramos el modal al guardar (sea nueva o editada)
    handleClose();
  };

  const handleDeleteAccount = async (id: string) => {
    const confirmDelete = window.confirm("¿Seguro que quieres eliminar esta cuenta?");
    if (!confirmDelete) return;

    const updatedAccounts = accounts.filter((a: any) => a.id !== id);
    
    const newGlobalBalance = updatedAccounts.reduce((sum: number, acc: any) => {
      return acc.excludeFromTotal ? sum : sum + acc.balance;
    }, 0);

    const newState = {
      ...state,
      accounts: updatedAccounts,
      balance: newGlobalBalance
    };

    await saveState(newState);
    if (editingId === id) resetForm();
  };

  const fmt = (n: number) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fade_0.2s_ease]">
      <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] w-full max-w-md rounded-[24px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        
        <div className="flex justify-between items-center p-5 border-b border-[var(--paper-line)]">
          <h2 className="font-['Playfair_Display'] text-[18px] font-semibold text-[var(--ink)] m-0">
            Mis Cuentas
          </h2>
          <button onClick={handleClose} className="text-[20px] text-[var(--text-soft)] hover:text-[var(--coral)] transition-colors cursor-pointer bg-transparent border-none">
            ×
          </button>
        </div>

        <div className="p-5 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <form onSubmit={handleSubmit} className="space-y-4 mb-6 bg-[var(--paper)] p-4 rounded-[16px] border border-[var(--paper-line)] relative">
            
            {editingId && !accountToEdit && (
              <div className="absolute top-4 right-4">
                <button type="button" onClick={resetForm} className="text-[11px] text-[var(--text-soft)] hover:text-[var(--ink)] underline cursor-pointer bg-transparent border-none">
                  Cancelar edición
                </button>
              </div>
            )}

            <h3 className="text-[13px] font-semibold text-[var(--ink)] m-0">
              {editingId ? 'Editando cuenta...' : 'Añadir nueva cuenta'}
            </h3>
            
            <div>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => { setType('bank'); setExcludeFromTotal(false); }}
                  className={`flex-1 py-2 rounded-[8px] text-[12px] font-medium transition-colors border flex items-center justify-center gap-2 ${type === 'bank' ? 'bg-[var(--gold)] text-[#0D0D12] border-[var(--gold)] shadow-sm' : 'bg-[var(--paper-2)] text-[var(--text-soft)] border-[var(--paper-line)] hover:text-[var(--ink)]'}`}
                >
                  <span className="text-[16px]">🏦</span> Banco
                </button>
                <button 
                  type="button"
                  onClick={() => setType('cash')}
                  className={`flex-1 py-2 rounded-[8px] text-[12px] font-medium transition-colors border flex items-center justify-center gap-2 ${type === 'cash' ? 'bg-[var(--gold)] text-[#0D0D12] border-[var(--gold)] shadow-sm' : 'bg-[var(--paper-2)] text-[var(--text-soft)] border-[var(--paper-line)] hover:text-[var(--ink)]'}`}
                >
                  <span className="text-[16px]">💵</span> Efectivo
                </button>
              </div>
            </div>

            {type === 'bank' && (
              <div className="animate-[fade_0.2s_ease]">
                <label className="block text-[11px] font-medium text-[var(--text-soft)] uppercase mb-1.5">Uso de la cuenta</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setBankPurpose('daily')} className={`flex-1 py-1.5 rounded-[6px] text-[11px] font-medium transition-colors border ${bankPurpose === 'daily' ? 'bg-[var(--gold)] text-[#0D0D12] border-[var(--gold)]' : 'bg-[var(--paper-2)] text-[var(--text-soft)] border-[var(--paper-line)] hover:text-[var(--ink)]'}`}>Día a día</button>
                  <button type="button" onClick={() => setBankPurpose('savings')} className={`flex-1 py-1.5 rounded-[6px] text-[11px] font-medium transition-colors border ${bankPurpose === 'savings' ? 'bg-[var(--gold)] text-[#0D0D12] border-[var(--gold)]' : 'bg-[var(--paper-2)] text-[var(--text-soft)] border-[var(--paper-line)] hover:text-[var(--ink)]'}`}>Ahorro</button>
                  <button type="button" onClick={() => setBankPurpose('both')} className={`flex-1 py-1.5 rounded-[6px] text-[11px] font-medium transition-colors border ${bankPurpose === 'both' ? 'bg-[var(--gold)] text-[#0D0D12] border-[var(--gold)]' : 'bg-[var(--paper-2)] text-[var(--text-soft)] border-[var(--paper-line)] hover:text-[var(--ink)]'}`}>Ambas</button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-[var(--text-soft)] uppercase mb-1">Nombre</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={type === 'cash' ? "Ej: Bote de casa, Hucha..." : "Ej: BBVA, Santander..."}
                className="w-full p-2.5 rounded-[8px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[13px] outline-none focus:border-[var(--gold)] transition-colors"
                required
              />
            </div>

            {type === 'cash' ? (
              <div className="animate-[fade_0.2s_ease] border-t border-[var(--paper-line)] pt-3 mt-3">
                <label className="block text-[11px] font-medium text-[var(--text-soft)] uppercase mb-2 text-center">Calculadora de Billetes y Monedas</label>
                
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {BILLS.map((val) => (
                     <div key={val} className="flex flex-col border border-[var(--paper-line)] rounded-[6px] overflow-hidden bg-[var(--paper-2)] focus-within:border-[var(--gold)] transition-colors">
                       <div className="bg-[var(--paper)] text-[10px] text-center font-bold text-[var(--text-soft)] py-1 border-b border-[var(--paper-line)]">{val}€</div>
                       <input 
                         type="number" min="0" placeholder="0" inputMode="numeric"
                         value={cashCounts[val] || ''}
                         onChange={(e) => setCashCounts(prev => ({...prev, [val]: e.target.value}))}
                         className="w-full bg-transparent text-center text-[13px] py-1.5 outline-none font-['IBM_Plex_Mono'] text-[var(--ink)] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                       />
                     </div>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {COINS.map((val) => (
                     <div key={val} className="flex flex-col border border-[var(--paper-line)] rounded-[6px] overflow-hidden bg-[var(--paper-2)] focus-within:border-[var(--gold)] transition-colors">
                       <div className="bg-[var(--paper)] text-[10px] text-center font-bold text-[var(--text-soft)] py-1 border-b border-[var(--paper-line)]">{val >= 1 ? `${val}€` : `${(val * 100).toFixed(0)}c`}</div>
                       <input 
                         type="number" min="0" placeholder="0" inputMode="numeric"
                         value={cashCounts[val] || ''}
                         onChange={(e) => setCashCounts(prev => ({...prev, [val]: e.target.value}))}
                         className="w-full bg-transparent text-center text-[13px] py-1.5 outline-none font-['IBM_Plex_Mono'] text-[var(--ink)] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                       />
                     </div>
                  ))}
                </div>

                <div className="flex items-center justify-between bg-[var(--paper-2)] px-4 py-3 rounded-[8px] border border-[var(--paper-line)] mt-4">
                  <span className="text-[12px] font-medium text-[var(--text-soft)] uppercase tracking-wider">Total Contado:</span>
                  <span className="font-['IBM_Plex_Mono'] text-[18px] font-bold text-[var(--gold)]">{fmt(cashTotal)}</span>
                </div>

                <div className="flex items-center gap-2 mt-3 p-3 bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[8px]">
                  <input 
                    type="checkbox" 
                    id="excludeTotal"
                    checked={excludeFromTotal}
                    onChange={(e) => setExcludeFromTotal(e.target.checked)}
                    className="w-4 h-4 accent-[var(--gold)] cursor-pointer shrink-0"
                  />
                  <label htmlFor="excludeTotal" className="text-[11px] text-[var(--text-soft)] cursor-pointer leading-tight select-none">
                    Excluir este dinero del saldo principal ("En cuenta ahora")
                  </label>
                </div>

              </div>
            ) : (
              <div className="animate-[fade_0.2s_ease]">
                <label className="block text-[11px] font-medium text-[var(--text-soft)] uppercase mb-1">Saldo Actual</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-2.5 rounded-[8px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[13px] outline-none focus:border-[var(--gold)] transition-colors font-['IBM_Plex_Mono'] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                  required={type === 'bank'}
                />
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-[var(--ink)] text-[var(--paper)] font-semibold text-[13px] py-2.5 rounded-[8px] border-none cursor-pointer active:scale-95 transition-transform mt-2"
            >
              {editingId ? 'Guardar Cambios' : `Crear ${type === 'cash' ? 'efectivo' : 'cuenta'}`}
            </button>
          </form>

          {/* Lista de cuentas existentes */}
          {!accountToEdit && (
            <div className="space-y-3 pb-4">
              <h3 className="text-[13px] font-semibold text-[var(--ink)] m-0">Tus cuentas actuales</h3>
              {accounts.length === 0 ? (
                <p className="text-[12px] text-[var(--text-soft)]">No tienes cuentas creadas.</p>
              ) : (
                accounts.map((acc: any) => (
                  <div key={acc.id} className="flex items-center justify-between p-3 bg-[var(--paper)] border border-[var(--paper-line)] rounded-[12px] hover:bg-[var(--paper-2)] transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-full text-[18px] shrink-0">
                        {acc.type === 'cash' ? '💵' : '🏦'}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[var(--ink)] m-0">{acc.name}</p>
                        <p className="text-[11px] text-[var(--text-soft)] m-0">
                          {acc.type === 'cash' 
                            ? `Efectivo${acc.excludeFromTotal ? ' • Oculto del total' : ''}` 
                            : `Banco • ${acc.purpose === 'daily' ? 'Día a día' : acc.purpose === 'savings' ? 'Ahorro' : 'Ambas'}`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-['IBM_Plex_Mono'] text-[14px] font-bold ${acc.excludeFromTotal ? 'text-[var(--text-soft)] opacity-80' : 'text-[var(--ink)]'}`}>
                        {fmt(acc.balance)}
                      </span>
                      <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditClick(acc)}
                          className="text-[var(--text-soft)] bg-transparent border-none text-[15px] p-1.5 cursor-pointer hover:text-[var(--gold)] transition-colors"
                          title="Editar cuenta"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => handleDeleteAccount(acc.id)}
                          className="text-[var(--text-soft)] bg-transparent border-none text-[15px] p-1.5 cursor-pointer hover:text-[var(--coral)] transition-colors"
                          title="Eliminar cuenta"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}