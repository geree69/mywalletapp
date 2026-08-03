'use client';

import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import Link from 'next/link';

const fmt = (n: number) => {
  const v = Number(n) || 0;
  return v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
};

// Función para obtener la fecha local de España (YYYY-MM-DD) sin problemas de zona horaria
const getLocalToday = () => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
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
  const [taeDate, setTaeDate] = useState<string>('');
  const [taeAccumulated, setTaeAccumulated] = useState<string>('');

  const handleEditClick = (acc: any) => {
    const todayStr = getLocalToday();
    setEditingTaeId(acc.id);
    setTaeValue(acc.tae?.toString() || '');
    setTaeDate(acc.taeStartDate || todayStr);
    setTaeAccumulated(acc.taeAccumulated ? acc.taeAccumulated.toString() : '');
  };

  const handleSaveTae = async (accountId: string) => {
    const todayStr = getLocalToday();
    
    const updatedAccounts = accounts.map((acc: any) => {
      if (acc.id === accountId) {
        return { 
          ...acc, 
          tae: Number(taeValue) || 0,
          taeStartDate: taeDate || todayStr,
          taeAccumulated: Number(taeAccumulated) || 0,
          taeLastUpdated: todayStr 
        };
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
    setTaeDate('');
    setTaeAccumulated('');
  };

  return (
    <div className="flex flex-col space-y-4 pb-6">
      
      {/* CABECERA CON EL NUEVO BOTÓN DE INFORMES */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="font-['Playfair_Display'] text-[20px] font-semibold m-0 mb-1 text-[var(--ink)] tracking-wide">
            Ahorro y TAE
          </h2>
          <p className="text-[12px] text-[var(--text-soft)] m-0 leading-relaxed">
            Gestiona tus cuentas de ahorro y visualiza los intereses que generan día a día.
          </p>
        </div>
        <Link 
          href="/dashboard/informes"
          className="shrink-0 bg-[var(--paper-2)] border border-[var(--paper-line)] text-[var(--ink)] px-3 py-2 rounded-[8px] text-[11px] font-semibold flex items-center gap-1.5 hover:border-[var(--gold)] hover:text-[var(--gold)] transition-colors no-underline cursor-pointer"
        >
          <span>Informes</span>
          <span className="text-[14px]">📊</span>
        </Link>
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
            
            // Cálculo de beneficio generado inteligente
            let earnedSoFar = 0;
            let daysElapsed = 0;
            
            if (tae > 0 && acc.taeStartDate) {
              const todayStr = getLocalToday();
              const start = new Date(acc.taeStartDate).getTime();
              const todayTime = new Date(todayStr).getTime();
              
              // Días totales desde que abrió la cuenta
              daysElapsed = Math.max(0, Math.floor((todayTime - start) / (1000 * 60 * 60 * 24)));
              
              // Días transcurridos desde que introdujo su beneficio acumulado
              const lastUpdated = acc.taeLastUpdated ? new Date(acc.taeLastUpdated).getTime() : start;
              const daysSinceUpd = Math.max(0, Math.floor((todayTime - lastUpdated) / (1000 * 60 * 60 * 24)));
              
              const accumulatedBase = Number(acc.taeAccumulated) || 0;
              
              // Fórmula: Beneficio previo + (Capital actual * TAE / 365) * días transcurridos
              earnedSoFar = accumulatedBase + (balance * (tae / 100) / 365) * daysSinceUpd;
            }

            return (
              <div 
                key={acc.id} 
                className="bg-[var(--paper-2)] border border-[var(--paper-line)] rounded-[var(--radius)] p-4 space-y-3 shadow-sm"
              >
                {/* Cabecera de la cuenta */}
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

                {/* Formulario de edición o Vista de Rentabilidad */}
                <div className="border-t border-[var(--paper-line)] pt-3">
                  {editingTaeId === acc.id ? (
                    <div className="bg-[var(--paper)] p-3 rounded-[10px] border border-[var(--paper-line)] space-y-3 animate-[fade_0.2s_ease]">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-[var(--text-soft)] mb-1 uppercase">TAE (%)</label>
                          <input 
                            type="number"
                            step="0.01"
                            placeholder="Ej: 2.5"
                            value={taeValue}
                            onChange={(e) => setTaeValue(e.target.value)}
                            className="w-full p-2 rounded-[6px] border border-[var(--gold)] bg-[var(--paper-2)] text-[var(--ink)] text-[12px] outline-none font-['IBM_Plex_Mono']"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-[var(--text-soft)] mb-1 uppercase">Fecha inicio</label>
                          <input 
                            type="date"
                            value={taeDate}
                            onChange={(e) => setTaeDate(e.target.value)}
                            className="w-full p-2 rounded-[6px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[12px] outline-none [color-scheme:dark]"
                          />
                        </div>
                        
                        {/* Campo opcional para sumar lo ya ganado */}
                        <div className="col-span-2 mt-1">
                          <label className="block text-[10px] text-[var(--text-soft)] mb-1 uppercase text-[var(--teal-d)] font-semibold">
                            Beneficio previo acumulado (opcional, Bruto €)
                          </label>
                          <input 
                            type="number"
                            step="0.01"
                            placeholder="Ej: 4.46"
                            value={taeAccumulated}
                            onChange={(e) => setTaeAccumulated(e.target.value)}
                            className="w-full p-2 rounded-[6px] border border-[var(--teal-d)] bg-[rgba(42,157,143,0.05)] text-[var(--ink)] text-[12px] outline-none font-['IBM_Plex_Mono']"
                          />
                          <p className="text-[9px] text-[var(--text-soft)] m-0 mt-1.5 leading-tight">
                            Si ya has ganado dinero previamente con esta cuenta, ponlo aquí para sumarlo a lo que vas a generar a partir de ahora. Si lo dejas vacío, se calculará solo desde la fecha de inicio.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button 
                          onClick={() => handleSaveTae(acc.id)}
                          className="flex-1 py-1.5 bg-[var(--gold)] text-[#0D0D12] rounded-[6px] font-semibold text-[11px] border-none cursor-pointer"
                        >
                          Guardar
                        </button>
                        <button 
                          onClick={() => setEditingTaeId(null)}
                          className="flex-1 py-1.5 bg-[var(--paper-2)] border border-[var(--paper-line)] text-[var(--ink)] rounded-[6px] font-semibold text-[11px] cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-end">
                      <div>
                        {tae > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-['IBM_Plex_Mono'] text-[13px] font-medium text-[var(--ink)]">
                                {tae}% TAE
                              </span>
                              <button 
                                onClick={() => handleEditClick(acc)}
                                className="text-[11px] text-[var(--text-soft)] hover:text-[var(--gold)] bg-transparent border-none cursor-pointer p-0 transition-colors"
                              >
                                Editar
                              </button>
                            </div>
                            <p className="text-[10px] text-[var(--text-soft)] m-0">
                              Desde {acc.taeStartDate} ({daysElapsed} días)
                            </p>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleEditClick(acc)}
                            className="text-[12px] font-medium text-[var(--gold)] bg-transparent border-none cursor-pointer hover:underline p-0"
                          >
                            + Configurar rentabilidad
                          </button>
                        )}
                      </div>

                      {tae > 0 && (
                        <div className="text-right flex flex-col gap-1.5">
                          <div>
                            <p className="text-[10px] text-[var(--text-soft)] m-0">Estimado anual (Bruto)</p>
                            <p className="font-['IBM_Plex_Mono'] text-[12px] font-medium text-[var(--text-soft)] m-0">
                              +{fmt(estimatedAnnualReturn)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Resaltado del Beneficio Generado (Solo si hay TAE) */}
                {!editingTaeId && tae > 0 && (
                  <div className="bg-[rgba(42,157,143,0.1)] border border-[rgba(42,157,143,0.2)] rounded-[8px] p-2.5 flex justify-between items-center mt-2">
                    <span className="text-[11px] font-medium text-[var(--teal-d)]">
                      Beneficio generado (Bruto)
                    </span>
                    <span className="font-['IBM_Plex_Mono'] text-[14px] font-bold text-[var(--teal-d)]">
                      +{fmt(earnedSoFar)}
                    </span>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}