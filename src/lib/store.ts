import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'en' | 'hi' | 'mr';

export type CurrentAnalysis = {
  id: string;
  pros: string[];
  cons: string[];
  hiddenClauses: string[];
  repaymentInfo: string;
  riskScore: number;
  risk_explanation: string;
  summary: string;
  quiz: any[];
  documentType?: string;
  specificClauses?: { text: string; severity: 'high' | 'medium' | 'low' }[];
};

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

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
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

  simplifiedMode: boolean;
  setSimplifiedMode: (mode: boolean) => void;

  chatHistory: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  clearChatHistory: () => void;
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

      simplifiedMode: false,
      setSimplifiedMode: (mode) => set({ simplifiedMode: mode }),

      chatHistory: [],
      addChatMessage: (msg) => set((state) => ({ chatHistory: [...state.chatHistory, msg] })),
      clearChatHistory: () => set({ chatHistory: [] }),
    }),
    {
      name: 'clearconsent-storage',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // Clear history from old schema versions to prevent type-mismatch crashes
          // (e.g. summary being an object instead of a string)
          return { ...persistedState, history: [] };
        }
        return persistedState;
      },
      partialize: (state) => ({
        history: state.history,
        currentAnalysis: state.currentAnalysis,
        currentSimulation: state.currentSimulation,
        simulationPrefill: state.simulationPrefill,
        user: state.user,
        simplifiedMode: state.simplifiedMode,
        chatHistory: state.chatHistory,
        // language is intentionally excluded — always starts as 'en'
      }),
    }
  )
);
