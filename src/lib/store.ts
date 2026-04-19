import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'en' | 'hi' | 'mr';

export type HistoryItem = {
  id: string;
  type: 'analysis' | 'simulation';
  date: string;
  riskScore: number;
  status?: string;
  details: any;
};

export type SimulationPrefill = {
  loan_amount: number | null;
  interest_rate: number | null;
  tenure_months: number | null;
  monthly_income: number | null;
};

interface AppState {
  language: Language;
  setLanguage: (lang: Language) => void;

  history: HistoryItem[];
  addHistory: (item: HistoryItem) => void;

  currentAnalysis: any | null;
  setCurrentAnalysis: (analysis: any) => void;

  currentSimulation: any | null;
  setCurrentSimulation: (simulation: any) => void;

  // Prefill values extracted from analyzed document → passed to simulate page
  simulationPrefill: SimulationPrefill | null;
  setSimulationPrefill: (prefill: SimulationPrefill | null) => void;

  user: any | null;
  setUser: (user: any | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (lang) => set({ language: lang }),

      history: [],
      addHistory: (item) => set((state) => ({ history: [item, ...state.history] })),

      currentAnalysis: null,
      setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),

      currentSimulation: null,
      setCurrentSimulation: (simulation) => set({ currentSimulation: simulation }),

      simulationPrefill: null,
      setSimulationPrefill: (prefill) => set({ simulationPrefill: prefill }),

      user: null,
      setUser: (u) => set({ user: u }),
    }),
    {
      name: 'clearconsent-storage',
      partialize: (state) => ({
        history: state.history,
        currentAnalysis: state.currentAnalysis,
        currentSimulation: state.currentSimulation,
        simulationPrefill: state.simulationPrefill,
        user: state.user,
        // language is intentionally excluded — always starts as 'en'
      }),
    }
  )
);
