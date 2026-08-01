'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

const initialState = {
  balance: 0,
  annualBudget: 0,
  budgetStartMonth: "",
  transactions: [],
  savings: { amount: 0, tae: 2.25, earnedInterest: 0 },
  investments: [],
  mergeAccounts: false
};

const AppContext = createContext<any>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [state, setState] = useState(initialState);
  const [loadingData, setLoadingData] = useState(true);
  const [dbError, setDbError] = useState(false); // NUEVO: Control de errores de base de datos

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setDbError(false);
        loadData(currentUser.uid);
      } else {
        setState(initialState);
        setLoadingData(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadData = async (uid: string) => {
    setLoadingData(true);
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const parsed = docSnap.data();
        setState(prevState => ({
          ...prevState,
          ...parsed,
          savings: { ...prevState.savings, ...(parsed.savings || {}) }
        }));
      } else {
        await setDoc(docRef, initialState);
      }
    } catch (e: any) {
      console.error("Error al cargar de Firebase:", e);
      setDbError(true); // Si Firebase rechaza la conexión, activamos el aviso
    } finally {
      setLoadingData(false);
    }
  };

  const saveState = async (newState: any) => {
    if (!user) return false;
    try {
      setState(newState); 
      await setDoc(doc(db, "users", user.uid), JSON.parse(JSON.stringify(newState)));
      return true;
    } catch (e) {
      console.error("Error guardando en la nube", e);
      alert("No se ha podido guardar el cambio en la nube. Revisa tu conexión o permisos.");
      return false;
    }
  };

  // NUEVO: Pantalla de aviso si Firebase bloquea la lectura
  if (dbError) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[var(--background)] p-6 text-center">
        <span className="text-[40px] mb-4">⚠️</span>
        <h2 className="font-['Playfair_Display'] text-[20px] font-semibold text-[var(--ink)] mb-2">
          Error de conexión a la base de datos
        </h2>
        <p className="text-[13px] text-[var(--text-soft)] max-w-[300px]">
          No hemos podido descargar tus datos. Esto suele ocurrir por un error de permisos en Firebase o problemas de conexión. Tus datos no se han borrado.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 bg-[var(--gold)] text-[#0D0D12] font-semibold text-[13px] px-6 py-2.5 rounded-[10px] border-none cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ user, state, loadingData, saveState }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);