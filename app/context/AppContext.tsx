'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

// Definimos la estructura de tus datos exactos
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

  // 1. Escuchamos quién inicia sesión
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadData(currentUser.uid);
      } else {
        setState(initialState);
        setLoadingData(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Descargamos tu libreta de Firebase
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
        // Si es un usuario nuevo, le creamos su documento
        await setDoc(docRef, initialState);
      }
    } catch (e) {
      console.error("Error al cargar de Firebase", e);
    } finally {
      setLoadingData(false);
    }
  };

  // 3. Función para guardar cambios (la usaremos al añadir movimientos)
  const saveState = async (newState: any) => {
    if (!user) return false;
    try {
      setState(newState); // Actualiza la pantalla al instante
      await setDoc(doc(db, "users", user.uid), JSON.parse(JSON.stringify(newState)));
      return true;
    } catch (e) {
      console.error("Error guardando en la nube", e);
      alert("No se ha podido guardar el cambio en la nube.");
      return false;
    }
  };

  return (
    <AppContext.Provider value={{ user, state, loadingData, saveState }}>
      {children}
    </AppContext.Provider>
  );
}

// Herramienta rápida para usar los datos en cualquier pestaña
export const useAppContext = () => useContext(AppContext);