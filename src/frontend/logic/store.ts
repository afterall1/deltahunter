/**
 * Delta Hunter - Zustand Store
 * Frontend state yönetimi.
 * KURAL: Tüm veri buradan akacak.
 */

import { create } from 'zustand';
import { CoinAnalysis } from '../../shared/types.js';
import { DEFAULT_REFRESH_RATE_MS, LOOKBACK_OPTIONS } from '../../shared/constants.js';

// Filter tipi
export type FilterType = 'ALL' | 'GAINERS' | 'LOSERS';

// Store state tipi
interface CryptoState {
    // Coin verileri (gainers + losers birleşik)
    coins: CoinAnalysis[];

    // Filtre durumu
    filter: FilterType;

    // Loading durumu
    isLoading: boolean;

    // Son güncelleme zamanı
    lastUpdate: number | null;

    // Hata mesajı
    error: string | null;

    // Konfigürasyon
    config: {
        lookbackPeriod: number;      // Dakika
        refreshInterval: number;      // Milisaniye
    };

    // Actions
    setCoins: (coins: CoinAnalysis[]) => void;
    setFilter: (filter: FilterType) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    updateConfig: (newConfig: Partial<CryptoState['config']>) => void;
}

// Zustand store
export const useCryptoStore = create<CryptoState>((set) => ({
    // Initial state
    coins: [],
    filter: 'ALL',
    isLoading: false,
    lastUpdate: null,
    error: null,

    // Config - constants.ts'ten varsayılanlar
    config: {
        lookbackPeriod: LOOKBACK_OPTIONS[0], // 5 dakika
        refreshInterval: DEFAULT_REFRESH_RATE_MS, // 5 dakika
    },

    // Actions
    setCoins: (coins) => set({
        coins,
        lastUpdate: Date.now(),
        error: null,
    }),

    setFilter: (filter) => set({ filter }),

    setLoading: (isLoading) => set({ isLoading }),

    setError: (error) => set({ error, isLoading: false }),

    updateConfig: (newConfig) => set((state) => ({
        config: { ...state.config, ...newConfig },
    })),
}));

export default useCryptoStore;
