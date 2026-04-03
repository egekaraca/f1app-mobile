import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getFavoriteDrivers, setFavoriteDrivers, getFavoriteConstructors, setFavoriteConstructors } from './storage';

interface FavoritesContextType {
  favoriteDrivers: string[];
  favoriteConstructors: string[];
  addFavoriteDriver: (driverId: string) => Promise<void>;
  removeFavoriteDriver: (driverId: string) => Promise<void>;
  addFavoriteConstructor: (constructorId: string) => Promise<void>;
  removeFavoriteConstructor: (constructorId: string) => Promise<void>;
  toggleFavoriteDriver: (driverId: string) => Promise<void>;
  toggleFavoriteConstructor: (constructorId: string) => Promise<void>;
  isLoading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteDrivers, setFavoriteDriversState] = useState<string[]>([]);
  const [favoriteConstructors, setFavoriteConstructorsState] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const [drivers, constructors] = await Promise.all([
        getFavoriteDrivers(),
        getFavoriteConstructors(),
      ]);
      setFavoriteDriversState(drivers);
      setFavoriteConstructorsState(constructors);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addFavoriteDriver = async (driverId: string) => {
    if (!favoriteDrivers.includes(driverId)) {
      const updated = [...favoriteDrivers, driverId];
      setFavoriteDriversState(updated);
      await setFavoriteDrivers(updated);
    }
  };

  const removeFavoriteDriver = async (driverId: string) => {
    const updated = favoriteDrivers.filter(id => id !== driverId);
    setFavoriteDriversState(updated);
    await setFavoriteDrivers(updated);
  };

  const toggleFavoriteDriver = async (driverId: string) => {
    if (favoriteDrivers.includes(driverId)) {
      await removeFavoriteDriver(driverId);
    } else {
      await addFavoriteDriver(driverId);
    }
  };

  const addFavoriteConstructor = async (constructorId: string) => {
    if (!favoriteConstructors.includes(constructorId)) {
      const updated = [...favoriteConstructors, constructorId];
      setFavoriteConstructorsState(updated);
      await setFavoriteConstructors(updated);
    }
  };

  const removeFavoriteConstructor = async (constructorId: string) => {
    const updated = favoriteConstructors.filter(id => id !== constructorId);
    setFavoriteConstructorsState(updated);
    await setFavoriteConstructors(updated);
  };

  const toggleFavoriteConstructor = async (constructorId: string) => {
    if (favoriteConstructors.includes(constructorId)) {
      await removeFavoriteConstructor(constructorId);
    } else {
      await addFavoriteConstructor(constructorId);
    }
  };

  const value: FavoritesContextType = {
    favoriteDrivers,
    favoriteConstructors,
    addFavoriteDriver,
    removeFavoriteDriver,
    addFavoriteConstructor,
    removeFavoriteConstructor,
    toggleFavoriteDriver,
    toggleFavoriteConstructor,
    isLoading,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}

