'use client';

import { useState } from 'react';
import { useAppContext } from '../context/AppContext';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export default function AccountModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { state, saveState } = useAppContext();
  
  const [name, setName] = useState('');
  const [type, setType] = useState('general'); // 'general' o 'savings'
  const [tae, setTae] = useState('2.5');

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!name.trim()) return alert("Por favor, introduce un nombre para la cuenta.");
    
    const accounts = state.accounts || [];
    const newState = { 
      ...state, 
      accounts: [...accounts, { 
        id: uid(), 
        name: name.trim(), // Respetamos estrictamente el nombre que has puesto
        type, 
        tae: type === 'savings' ? parseFloat(tae) || 0 : 0 
      }] 
    };
    
    const ok = await saveState(newState);
    if (ok) {
      setName('');
      setType('general');
      setTae('2.5');
      onClose();
    }
  };

  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-[4px] z-[100] flex items-end justify-center" onClick={onClose}>
      <div className="bg-[var(--paper)] w-full max-h-[85%] rounded-t-[24px] flex flex-col border-t border-[var(--paper-line)] animate-[fade_0.3s_ease]" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-[var(--paper-line)] shrink-0 flex justify-between items-center relative z-20">
          <h3 className="font-['Playfair_Display'] text-[19px] font-bold m-0 text-[var(--ink)]">Añadir nueva cuenta</h3>
          <button onClick={onClose} className="text-[24px] leading-none text-[var(--text-soft)] bg-transparent border-none cursor-pointer p-1">×</button>
        </div>
        
        <div className="p-6 overflow-y-auto pb-10 relative z-10 space-y-4">
          <div>
            <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">Nombre de la cuenta</label>
            <input 
              type="text" 
              placeholder="Ej. Cuenta General, Mi BBVA, Hucha Viaje..." 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)]"
            />
          </div>

          <div>
            <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">Tipo de cuenta</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value)}
              className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)] cursor-pointer"
            >
              <option value="general">General / Día a día</option>
              <option value="savings">De Ahorro (con TAE)</option>
            </select>
          </div>

          {type === 'savings' && (
            <div>
              <label className="block text-[12px] text-[var(--text-soft)] mb-2 font-medium">Porcentaje TAE (%)</label>
              <input 
                type="number" 
                step="0.01" 
                placeholder="Ej. 2.5" 
                value={tae} 
                onChange={(e) => setTae(e.target.value)}
                className="w-full p-3 rounded-[10px] border border-[var(--paper-line)] bg-[var(--paper-2)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--gold)]"
              />
            </div>
          )}

          <button 
            onClick={handleCreate} 
            className="w-full bg-[var(--gold)] text-[#0D0D12] font-semibold text-[14px] p-3 rounded-[10px] active:scale-95 transition-transform cursor-pointer border-none shadow-sm mt-2"
          >
            Crear cuenta
          </button>
        </div>
      </div>
    </div>
  );
}