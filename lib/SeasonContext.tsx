import React, { createContext, useContext, useState } from 'react';

export const CURRENT_SEASON = '2026';
export const AVAILABLE_SEASONS = ['2024', '2025', '2026'] as const;

type SeasonContextType = {
  season: string;
  setSeason: (s: string) => void;
  isCurrentSeason: boolean;
};

const SeasonContext = createContext<SeasonContextType>({
  season: CURRENT_SEASON,
  setSeason: () => {},
  isCurrentSeason: true,
});

export function SeasonProvider({ children }: { children: React.ReactNode }) {
  const [season, setSeason] = useState(CURRENT_SEASON);
  return (
    <SeasonContext.Provider value={{ season, setSeason, isCurrentSeason: season === CURRENT_SEASON }}>
      {children}
    </SeasonContext.Provider>
  );
}

export function useSeason() {
  return useContext(SeasonContext);
}
