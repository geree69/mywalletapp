'use client';

import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';

const fmt = (n: number) => {
  const v = Number(n) || 0;
  return v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export default function ImportarPage() {
  const { state, saveState } = useAppContext();
  const accounts = state.accounts || [];

  const [selectedAccount, setSelectedAccount] = useState(accounts.length > 0 ? accounts[0].id : '');
  const [file, setFile] = useState<File | null>(null);
  const [pastingText, setPastingText] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewTxs, setPreviewTxs] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file && !pastingText.trim()) {
      return alert('Por favor, sube una imagen/captura o pega texto de tus movimientos.');
    }

    setLoading(true);
    setPreviewTxs([]);

    try {
      const formData = new FormData();
      if (file) formData.append('file', file);
      if (pastingText.trim()) formData.append('text', pastingText);

      const res = await fetch('/api/importar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al analizar el archivo');
      }

      if (data.transactions && Array.isArray(data.transactions)) {
        const formatted = data.transactions.map((t: any) => ({
          ...t,
          tempId: uid(),
          accountId: selectedAccount,
          selected: true
        }));
        setPreviewTxs(formatted);
      } else {
        alert('La IA no ha podido detectar movimientos claros en este archivo.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Hubo un error al procesar la IA: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (tempId: string) => {
    setPreviewTxs(prev => prev.map(t => t.tempId === tempId ? { ...t, selected: !t.selected } : t));
  };

  const handleChangeField = (tempId: string, field: string, value: any) => {
    setPreviewTxs(prev => prev.map(t => t.tempId === tempId ? { ...t, [field]: value } : t));
  };

  const handleConfirmImport = async () => {
    const toImport = previewTxs.filter(t => t.selected);
    if (toImport.length === 0) return alert('Selecciona al menos un movimiento para importar.');
    if (!selectedAccount) return alert('Selecciona una cuenta de destino para los movimientos.');

    const currentTxs = state.transactions || [];
    let updatedAccounts = [...accounts];

    const newTransactions = toImport.map(t => ({
      id: uid(),
      type: t.type,
      amount: Number(t.amount),
      date: t.date,
      title: t.title,
      category: t.category,
      isRecurring: t.isRecurring || false,
      accountId: selectedAccount
    }));

    let balanceAdjustment = 0;
    newTransactions.forEach(t => {
      const isExpense = t.type === 'expense';
      balanceAdjustment += isExpense ? -t.amount : t.amount;
    });

    updatedAccounts = updatedAccounts.map((acc: any) => {
      if (acc.id === selectedAccount) {
        return { ...acc, balance: Number(acc.balance || 0) + balanceAdjustment };
      }
      return acc;
    });

    const newState = {
      ...state,
      transactions: [...currentTxs, ...newTransactions],
      accounts: updatedAccounts,
      balance: updatedAccounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0)
    };

    const ok = await saveState(newState);
    if (ok) {
      alert(`¡Se han importado ${newTransactions.length} movimientos con sus fechas reales y el saldo se ha ajustado correctamente!`);
      setPreviewTxs([]);
      setFile(null);
      setPastingText('');
    }
  };

  return (
    <div className="flex flex-col space-y-4 pb-12">
      <div>
        <h2 className="font-['Playfair_Display'] text-[20px] font-semibold m-0 mb-1 text-[var(--ink)] tracking-wide">
          Importar Movimientos con IA
        </h2>
        <p className="text-[12px] text-[var(--text-soft)] m-0 leading-relaxed">
          Sube una captura de pantalla de tu banco, un ticket o un extracto. La IA organizará todo automáticamente.
        </p>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-6 text-center text-[var(--text-soft)] text-[13px]">
          Primero debes crear al menos una cuenta en el apartado de Resumen para poder importar movimientos.
        </div>
      ) : (
        <>
          <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-4 space-y-3">
            <label className="block text-[12px] text-[var(--text-soft)] font-medium uppercase">
              1. ¿A qué cuenta van destinados estos movimientos?
            </label>
            <select 
              value={selectedAccount} 
              onChange={(e) => setSelectedAccount(e.target.value)} 
              className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] text-[13px] outline-none focus:border-[var(--gold)]"
            >
              {accounts.map((acc: any) => (
                <option key={acc.id} value={acc.id}>{acc.name} ({fmt(acc.balance)})</option>
              ))}
            </select>
          </div>

          <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-4 space-y-3">
            <label className="block text-[12px] text-[var(--text-soft)] font-medium uppercase">
              2. Sube una captura de pantalla, foto o PDF del banco
            </label>
            <input 
              type="file" 
              accept="image/*,application/pdf,.csv,.txt" 
              onChange={handleFileChange}
              className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] text-[13px] outline-none file:mr-4 file:py-2 file:px-4 file:rounded-[6px] file:border-0 file:text-xs file:font-semibold file:bg-[var(--gold)] file:text-[#0D0D12] cursor-pointer"
            />
            {file && (
              <p className="text-[11px] text-[var(--teal-d)] m-0 font-medium">
                Archivo seleccionado: {file.name}
              </p>
            )}

            <div className="pt-2">
              <label className="block text-[11px] text-[var(--text-soft)] mb-1 font-medium">O pega texto libre directamente:</label>
              <textarea 
                rows={3}
                placeholder="Ej: 24/06/2026 Mercadona -45.60€, 25/06/2026 Nómina +1800€..."
                value={pastingText}
                onChange={(e) => setPastingText(e.target.value)}
                className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] text-[12px] outline-none focus:border-[var(--gold)] resize-none font-['IBM_Plex_Mono']"
              />
            </div>

            <button 
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full mt-2 bg-[var(--gold)] text-[#0D0D12] font-semibold text-[14px] p-3 rounded-[10px] border-none cursor-pointer active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                'Analizando imagen y clasificando con IA...'
              ) : (
                <>
                  <span className="text-[18px]">🔮</span> Analizar con Inteligencia Artificial
                </>
              )}
            </button>
          </div>

          {previewTxs.length > 0 && (
            <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-4 space-y-4 animate-[fade_0.3s_ease]">
              <div className="flex justify-between items-center border-b border-[var(--paper-line)] pb-3">
                <h3 className="font-['Playfair_Display'] text-[16px] font-semibold m-0 text-[var(--ink)]">
                  3. Revisa y confirma los movimientos ({previewTxs.filter(t=>t.selected).length} seleccionados)
                </h3>
              </div>

              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                {previewTxs.map((t) => (
                  <div 
                    key={t.tempId} 
                    className={`p-3 rounded-[10px] border transition-colors flex flex-col gap-2 ${t.selected ? 'bg-[var(--paper)] border-[var(--gold)]' : 'bg-[var(--paper)] border-[var(--paper-line)] opacity-50'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={t.selected} 
                          onChange={() => handleToggleSelect(t.tempId)}
                          className="w-4 h-4 accent-[var(--gold)] cursor-pointer"
                        />
                        <input 
                          type="text" 
                          value={t.title} 
                          onChange={(e) => handleChangeField(t.tempId, 'title', e.target.value)}
                          className="bg-[var(--paper-2)] border border-[var(--paper-line)] px-2 py-1 rounded-[6px] text-[13px] font-medium text-[var(--ink)] outline-none w-[180px]"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          step="0.01" 
                          value={t.amount} 
                          onChange={(e) => handleChangeField(t.tempId, 'amount', e.target.value)}
                          className={`bg-[var(--paper-2)] border border-[var(--paper-line)] px-2 py-1 rounded-[6px] text-[13px] font-bold outline-none w-[90px] font-['IBM_Plex_Mono'] text-right ${t.type === 'income' ? 'text-[var(--teal-d)]' : 'text-[var(--coral)]'}`}
                        />
                        <span className="text-[12px] text-[var(--text-soft)]">€</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--text-soft)] pt-1 border-t border-[var(--paper-line)]">
                      <div className="flex items-center gap-2">
                        <span>Fecha:</span>
                        <input 
                          type="date" 
                          value={t.date} 
                          onChange={(e) => handleChangeField(t.tempId, 'date', e.target.value)}
                          className="bg-[var(--paper-2)] border border-[var(--paper-line)] px-1.5 py-0.5 rounded-[4px] text-[11px] text-[var(--ink)] outline-none [color-scheme:dark]"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span>Categoría:</span>
                        <input 
                          type="text" 
                          value={t.category} 
                          onChange={(e) => handleChangeField(t.tempId, 'category', e.target.value)}
                          className="bg-[var(--paper-2)] border border-[var(--paper-line)] px-1.5 py-0.5 rounded-[4px] text-[11px] text-[var(--ink)] outline-none w-[110px]"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <select 
                          value={t.type} 
                          onChange={(e) => handleChangeField(t.tempId, 'type', e.target.value)}
                          className="bg-[var(--paper-2)] border border-[var(--paper-line)] px-1.5 py-0.5 rounded-[4px] text-[11px] text-[var(--ink)] outline-none"
                        >
                          <option value="expense">Gasto</option>
                          <option value="income">Ingreso</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={handleConfirmImport}
                className="w-full bg-[var(--teal-d)] text-white font-semibold text-[14px] p-3 rounded-[10px] border-none cursor-pointer active:scale-95 transition-transform"
              >
                Confirmar e importar a Firebase
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}