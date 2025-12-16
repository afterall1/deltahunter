/**
 * Delta Hunter - Constants
 * Magic Number YASAK! Tüm sabit değerler burada.
 */

// Varsayılan yenileme süresi (milisaniye)
// 5 dakika = 300,000 ms
export const DEFAULT_REFRESH_RATE_MS = 300_000;

// Bellekte tutulacak maksimum geçmiş süresi (dakika)
// 24 saat = 1440 dakika
export const MAX_HISTORY_MINUTES = 1440;

// Takip edilecek maksimum coin sayısı (Bellek güvenliği)
// En hacimli 150 USDT coin takip edilecek
export const MAX_TRACKED_COINS = 150;

// Pre-warming için kline limit (1 dakikalık mumlar, 24 saat = 1440)
export const KLINE_LIMIT = 1440;

// API Endpoints
export const API_PORT = 3001;
export const API_BASE_URL = `http://localhost:${API_PORT}`;

// Binance REST API
export const BINANCE_REST_URL = 'https://api.binance.com';

// Lookback period seçenekleri (dakika)
export const LOOKBACK_OPTIONS = [5, 15, 30, 60, 240, 1440] as const;

// Memory cleanup interval (dakika)
// Her 10 dakikada bir eski verileri temizle
export const CLEANUP_INTERVAL_MINUTES = 10;

// Pre-warming progress callback interval
export const WARMUP_PROGRESS_INTERVAL = 10;
