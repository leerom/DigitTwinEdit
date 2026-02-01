import { create } from 'zustand';

// Simulated WebSocket Service for Digital Twin Data
// In a real app, this would connect to a WS endpoint.

interface TwinDataState {
  data: Record<string, any>;
  connect: (url: string) => void;
  disconnect: () => void;
  simulate: () => void;
}

export const useTwinDataStore = create<TwinDataState>((set, get) => ({
  data: {},
  connect: () => {
    console.log("TwinDataService: Connected");
    // Start simulation
    get().simulate();
  },
  disconnect: () => {
    console.log("TwinDataService: Disconnected");
  },
  simulate: () => {
    // Mock data update every second
    setInterval(() => {
      set((state) => ({
        data: {
          ...state.data,
          'sim-1': { temperature: 20 + Math.random() * 5, status: 'Running' },
        }
      }));
    }, 1000);
  }
}));
