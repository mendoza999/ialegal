import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RamaDerecho } from '../types';

export const DEFAULT_RAMAS: RamaDerecho[] = [
  { id: 'f5fa96ce-2733-44df-914a-c298aab14215', nombre: 'Derecho Tributario' },
  { id: '77f93f98-5612-4bba-b410-8e99010b213f', nombre: 'Derecho Laboral' },
  { id: 'b343d03c-a69c-453e-8272-d8aabb756943', nombre: 'Derecho Civil' },
  { id: '4baf3b11-9f40-4d84-bb7c-1bd5eb71a692', nombre: 'Derecho Penal' },
  { id: 'eeeaa7af-8464-4d2e-9f5d-d346cd2d4f94', nombre: 'Derecho Constitucional' }
];

export const TRIBUTARIO_RAMA_ID = 'f5fa96ce-2733-44df-914a-c298aab14215';

interface RamaContextType {
  ramas: RamaDerecho[];
  selectedRama: RamaDerecho;
  setSelectedRama: (rama: RamaDerecho) => void;
  selectRamaById: (ramaId: string) => void;
  loading: boolean;
  refreshRamas: () => Promise<void>;
}

const RamaContext = createContext<RamaContextType | undefined>(undefined);

export const RamaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [ramas, setRamas] = useState<RamaDerecho[]>(DEFAULT_RAMAS);
  const [loading, setLoading] = useState<boolean>(true);

  // Load initial selected rama from localStorage or default to Tributario
  const [selectedRama, setSelectedRamaState] = useState<RamaDerecho>(() => {
    try {
      const savedId = localStorage.getItem('selected_rama_id');
      const savedNombre = localStorage.getItem('selected_rama_nombre');
      if (savedId && savedNombre) {
        return { id: savedId, nombre: savedNombre };
      }
    } catch (e) {
      // ignore
    }
    return DEFAULT_RAMAS[0];
  });

  const fetchRamas = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.BASE_URL}api/ramas`);
      if (res.ok) {
        const data = await res.json();
        if (data.ramas && Array.isArray(data.ramas) && data.ramas.length > 0) {
          setRamas(data.ramas);

          // Update current selection if it matches one of the fetched ones
          setSelectedRamaState(prev => {
            const match = data.ramas.find((r: RamaDerecho) => r.id === prev.id);
            return match || data.ramas[0];
          });
        }
      }
    } catch (err) {
      console.warn('[RamaContext] Error fetching ramas from server, using default list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRamas();
  }, []);

  const setSelectedRama = (rama: RamaDerecho) => {
    setSelectedRamaState(rama);
    try {
      localStorage.setItem('selected_rama_id', rama.id);
      localStorage.setItem('selected_rama_nombre', rama.nombre);
    } catch (e) {
      // ignore
    }
  };

  const selectRamaById = (ramaId: string) => {
    const found = ramas.find(r => r.id === ramaId);
    if (found) {
      setSelectedRama(found);
    }
  };

  return (
    <RamaContext.Provider
      value={{
        ramas,
        selectedRama,
        setSelectedRama,
        selectRamaById,
        loading,
        refreshRamas: fetchRamas
      }}
    >
      {children}
    </RamaContext.Provider>
  );
};

export const useRama = (): RamaContextType => {
  const context = useContext(RamaContext);
  if (!context) {
    throw new Error('useRama debe ser utilizado dentro de un RamaProvider');
  }
  return context;
};
