'use client';

import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';

const fmt = (n: number) => {
  const v = Number(n) || 0;
  return v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
};

export default function AhorroPage() {
  const { state, saveState } = useAppContext();
  const accounts = state.accounts || [];

  // Filtrar exclusivamente cuentas de ahorro o ambas
  const savingsAccounts = accounts.filter(
    (acc: any) => acc.type === 'ahorro' || acc.type === 'ambas'
  );

  const [editingTaeId, setEditingTaeId] = useState<string | null>(null);
  const [taeValue, setTaeValue] = useState<string>('');

  const handleSaveTae = async (accountId: string) => {
    const updatedAccounts = accounts.map((acc: any) => {
      if (acc.id === accountId) {
        return { ...acc, tae: Number(taeValue) || 0 };
      }
      return acc;
    });

    const newState = {
      ...state,
      accounts: updatedAccounts,
    };

    await saveState(newState);
    setEditingTaeId(null);
    setTaeValue('');
  };

  return (
    <div className="flex flex-col space-y-4 pb-6">
      <div>
        <h2 className="font-['Playfair_Display'] text-[20px] font-semibold m-0 mb-1 text-[var(--ink)] tracking-wide">
          Ahorro y TAE
        </h2>
        <p className="text-[12px] text-[var(--text-soft)] m-0 leading-relaxed">
          Gestiona tus cuentas de ahorro y configura su rentabilidad anual (TAE).
        </p>
      </div>

      {savingsAccounts.length === 0 ? (
        <div className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-6 text-center text-[var(--text-soft)] text-[13px]">
          No tienes cuentas de ahorro registradas. Crea una cuenta nueva desde el apartado de Resumen seleccionando el tipo "Ahorro" o "Ambas".
        </div>
      ) : (
        <div className="space-y-3">
          {savingsAccounts.map((acc: any) => {
            const balance = Number(acc.balance || 0);
            const tae = Number(acc.tae || 0);
            const estimatedAnnualReturn = (balance * tae) / 100;

            return (
              <div 
                key={acc.id} 
                className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-4 space-y-3 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-[14px] text-[var(--ink)] m-0">{acc.name}</p>
                    <p className="text-[10px] text-[var(--text-soft)] uppercase m-0 mt-0.5">
                      {acc.type === 'ahorro' ? 'Cuenta de Ahorro' : 'Día a día y Ahorro'}
                    </p>
                  </div>
                  <p className="font-['IBM_Plex_Mono'] text-[16px] font-semibold text-[var(--gold)] m-0">
                    {fmt(balance)}
                  </p>
                </div>

                <div className="border-t border-[var(--paper-line)] pt-3 flex justify-between items-center">
                  <div>
                    <p className="text-[11px] text-[var(--text-soft)] m-0">Rentabilidad TAE</p>
                    {editingTaeId === acc.id ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input 
                          type="number"
                          step="0.01"
                          placeholder="Ej: 2.5"
                          value={taeValue}
                          onChange={(e) => setTaeValue(e.target.value)}
                          className="w-20 p-1.5 rounded-[6px] border border-[var(--gold)] bg-[var(--paper)] text-[var(--ink)] text-[12px] outline-none font-['IBM_Plex_Mono']"
                        />
                        <button 
                          onClick={() => handleSaveTae(acc.id)}
                          className="px-2.5 py-1.5 bg-[var(--gold)] text-[#0D0D12] rounded-[6px] font-semibold text-[11px] border-none cursor-pointer"
                        >
                          Guardar
                        </button>
                        <button 
                          onClick={() => setEditingTaeId(null)}
                          className="px-2 py-1.5 text-[var(--text-soft)] bg-transparent border-none text-[11px] cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-0.5">
                        {tae > 0 ? (
                          <>
                            <span className="font-['IBM_Plex_Mono'] text-[13px] font-medium text-[var(--ink)]">
                              {tae}% TAE
                            </span>
                            <button 
                              onClick={() => { setEditingTaeId(acc.id); setTaeValue(tae.toString()); }}
                              className="text-[11px] text-[var(--gold)] bg-transparent border-none cursor-pointer hover:underline p-0"
                            >
                              Editar
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => { setEditingTaeId(acc.id); setTaeValue(''); }}
                            className="text-[13px] font-medium text-[var(--gold)] bg-transparent border-none cursor-pointer hover:underline p-0 font-['IBM_Plex_Mono']"
                          >
                            Añadir TAE
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {tae > 0 && (
                    <div className="text-right">
                      <p className="text-[10px] text-[var(--text-soft)] m-0">Estimado anual</p>
                      <p className="font-['IBM_Plex_Mono'] text-[12px] font-medium text-[var(--teal-d)] m-0">
                        +{fmt(estimatedAnnualReturn)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}