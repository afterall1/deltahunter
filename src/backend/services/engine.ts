/**
 * Delta Hunter - Data Engine (BEYİN)
 * Tüm fiyat verilerini bellekte tutar, hesaplar ve analiz eder.
 * Veritabanı YOK - sadece RAM.
 * Pre-warming desteği ile 24 saatlik geçmiş veri yüklenebilir.
 */

import { CoinData, CoinAnalysis, AnalysisResult } from '../../shared/types.js';
import { MAX_HISTORY_MINUTES, CLEANUP_INTERVAL_MINUTES, MAX_TRACKED_COINS } from '../../shared/constants.js';
import { evaluatePosition } from './strategy.js';

// Her sembol için fiyat geçmişi
// Map<symbol, CoinData[]>
const priceHistory: Map<string, CoinData[]> = new Map();

// Takip edilen coin listesi (hacim sıralamasına göre)
let trackedCoins: Set<string> = new Set();

/**
 * Takip edilecek coin listesini ayarla
 */
export function setTrackedCoins(symbols: string[]): void {
    trackedCoins = new Set(symbols.slice(0, MAX_TRACKED_COINS));
    console.log(`[Engine] ${trackedCoins.size} coin takip listesine eklendi`);
}

/**
 * Coin takip listesinde mi?
 */
export function isTracked(symbol: string): boolean {
    return trackedCoins.has(symbol);
}

/**
 * REST API'den gelen geçmiş verileri toplu yükle
 * klines format: [openTime, open, high, low, close, volume, closeTime, ...]
 */
export function addHistoricalData(symbol: string, klines: any[]): void {
    if (!priceHistory.has(symbol)) {
        priceHistory.set(symbol, []);
    }

    const history = priceHistory.get(symbol)!;

    for (let i = 0; i < klines.length; i++) {
        const kline = klines[i];
        // İlk mum için delta 0, sonrası için fiyat değişimine göre tahmin
        const prevClose = i > 0 ? parseFloat(klines[i - 1][4]) : parseFloat(kline[4]);
        const close = parseFloat(kline[4]);
        const volume = parseFloat(kline[5]);
        const priceChange = close - prevClose;
        const delta = priceChange >= 0 ? volume * 0.1 : -volume * 0.1;

        const data: CoinData = {
            symbol,
            price: close,
            volume,
            delta,
            timestamp: kline[6],
        };
        history.push(data);
    }

    // Zaman sırasına göre sırala (eski -> yeni)
    history.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Yeni fiyat ekle
 * Binance WebSocket'ten her fiyat geldiğinde bu fonksiyon çağrılır.
 */
export function addPrice(symbol: string, price: number, volume: number = 0, delta: number = 0): void {
    // Sadece takip edilen coinleri kabul et
    if (!trackedCoins.has(symbol)) return;

    const data: CoinData = {
        symbol,
        price,
        volume,
        delta,
        timestamp: Date.now(),
    };

    if (!priceHistory.has(symbol)) {
        priceHistory.set(symbol, []);
    }

    const history = priceHistory.get(symbol)!;
    history.push(data);
}

/**
 * Eski verileri temizle (Memory Leak Koruması)
 * MAX_HISTORY_MINUTES'tan eski verileri siler.
 */
export function cleanupOldData(): void {
    const cutoffTime = Date.now() - (MAX_HISTORY_MINUTES * 60 * 1000);
    let totalRemoved = 0;

    for (const [symbol, history] of priceHistory.entries()) {
        const originalLength = history.length;

        // En eski verilerden başlayarak cutoff'tan yenileri bul
        const firstValidIndex = history.findIndex(d => d.timestamp >= cutoffTime);

        if (firstValidIndex > 0) {
            // Eski verileri kaldır
            history.splice(0, firstValidIndex);
            totalRemoved += (originalLength - history.length);
        } else if (firstValidIndex === -1 && history.length > 0) {
            // Tüm veriler eski, hepsini temizle
            totalRemoved += history.length;
            history.length = 0;
        }
    }

    if (totalRemoved > 0) {
        console.log(`[Engine] Cleanup: ${totalRemoved} eski kayıt silindi`);
    }
}

/**
 * Belirli bir dakika öncesine en yakın veriyi bul
 */
function findClosestPrice(history: CoinData[], targetTime: number): CoinData | null {
    if (history.length === 0) return null;

    // Binary search ile daha verimli arama
    let left = 0;
    let right = history.length - 1;
    let closest: CoinData | null = null;
    let minDiff = Infinity;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const diff = Math.abs(history[mid].timestamp - targetTime);

        if (diff < minDiff) {
            minDiff = diff;
            closest = history[mid];
        }

        if (history[mid].timestamp < targetTime) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    return closest;
}

// CVD Divergence için Sliding Window boyutu
const CVD_WINDOW_SIZE = 20;

/**
 * CVD Divergence hesapla
 * Fiyat ve CVD (Cumulative Volume Delta) eğimlerini karşılaştırır.
 * Return: { score: -100 to +100, trend: UP/DOWN/NEUTRAL }
 */
function calculateDivergence(history: CoinData[]): { score: number; trend: 'UP' | 'DOWN' | 'NEUTRAL' } {
    // Son CVD_WINDOW_SIZE veriyi al
    const windowSize = Math.min(CVD_WINDOW_SIZE, history.length);
    if (windowSize < 5) {
        return { score: 0, trend: 'NEUTRAL' };
    }

    const window = history.slice(-windowSize);

    // Fiyat Eğimi: (Son - İlk) / İlk * 100
    const firstPrice = window[0].price;
    const lastPrice = window[window.length - 1].price;
    const priceSlope = ((lastPrice - firstPrice) / firstPrice) * 100;

    // CVD (Cumulative Volume Delta) hesapla
    let cvd = 0;
    const cvdValues: number[] = [];
    for (const data of window) {
        cvd += data.delta;
        cvdValues.push(cvd);
    }

    // CVD Eğimi: (Son CVD - İlk CVD)
    const firstCVD = cvdValues[0];
    const lastCVD = cvdValues[cvdValues.length - 1];
    const cvdSlope = lastCVD - firstCVD;

    // Normalize delta slope for comparison
    const avgVolume = window.reduce((sum, d) => sum + d.volume, 0) / window.length;
    const normalizedCVDSlope = avgVolume > 0 ? cvdSlope / (avgVolume * 0.1) : 0;

    // Trend belirleme
    let trend: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
    if (normalizedCVDSlope > 0.5) trend = 'UP';
    else if (normalizedCVDSlope < -0.5) trend = 'DOWN';

    // Divergence Score hesapla
    let score = 0;

    // BEARISH DIVERGENCE: Fiyat artıyor AMA CVD azalıyor (Fake Pump)
    if (priceSlope > 0.1 && normalizedCVDSlope < -0.3) {
        score = -Math.min(100, Math.abs(priceSlope - normalizedCVDSlope) * 20);
    }
    // BULLISH DIVERGENCE: Fiyat düşüyor/yatay AMA CVD artıyor (Gizli Toplama)
    else if (priceSlope < 0.1 && normalizedCVDSlope > 0.3) {
        score = Math.min(100, Math.abs(normalizedCVDSlope - priceSlope) * 20);
    }
    // Aynı yönde hareket = Uyumlu
    else {
        score = 0;
    }

    return { score: Math.round(score), trend };
}

/**
 * Analiz yap
 * İstenen dakikaya göre % değişimi hesaplar ve sıralar.
 */
export function analyze(lookbackMinutes: number): AnalysisResult {
    const now = Date.now();
    const targetTime = now - (lookbackMinutes * 60 * 1000);
    const results: CoinAnalysis[] = [];

    for (const [symbol, history] of priceHistory.entries()) {
        if (history.length === 0) continue;

        // En son fiyat (current)
        const currentData = history[history.length - 1];

        // Geçmişteki fiyat
        const oldData = findClosestPrice(history, targetTime);

        if (!oldData) continue;

        // Veri çok eski mi kontrol et (lookback süresinin 2 katından eski olmamalı)
        const maxAge = lookbackMinutes * 60 * 1000 * 2;
        if (Math.abs(oldData.timestamp - targetTime) > maxAge) continue;

        // Yüzde değişimi hesapla
        const percentChange = ((currentData.price - oldData.price) / oldData.price) * 100;

        // CVD Divergence hesapla
        const divergence = calculateDivergence(history);

        // AI Strateji Değerlendirmesi (Trinity Protocol)
        const aiSignal = evaluatePosition(
            symbol,
            currentData.price,
            divergence.score,
            history
        );

        // Sadece yüksek güvenilirlik varsa dahil et
        const coinAnalysis: CoinAnalysis = {
            symbol,
            percentChange,
            currentPrice: currentData.price,
            oldPrice: oldData.price,
            cvdDivergenceScore: divergence.score,
            deltaTrend: divergence.trend,
        };

        // AI sinyal varsa ekle
        if (aiSignal.direction !== 'NONE' && aiSignal.confidenceScore >= 80) {
            coinAnalysis.aiSignal = aiSignal;
        }

        results.push(coinAnalysis);
    }

    // Sıralama: Mutlak değişime göre (en çok hareket eden önce)
    results.sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange));

    // Gainers: Pozitif değişim
    const gainers = results.filter(r => r.percentChange > 0);

    // Losers: Negatif değişim
    const losers = results.filter(r => r.percentChange < 0);

    return {
        timestamp: now,
        lookbackMinutes,
        gainers,
        losers,
    };
}

/**
 * Mevcut durumu getir (debug için)
 */
export function getStatus(): { symbol: string; count: number; latestPrice: number }[] {
    const status: { symbol: string; count: number; latestPrice: number }[] = [];

    for (const [symbol, history] of priceHistory.entries()) {
        status.push({
            symbol,
            count: history.length,
            latestPrice: history.length > 0 ? history[history.length - 1].price : 0,
        });
    }

    return status;
}

/**
 * Toplam kayıt sayısını getir
 */
export function getTotalRecords(): number {
    let total = 0;
    for (const history of priceHistory.values()) {
        total += history.length;
    }
    return total;
}

/**
 * Cleanup timer'ı başlat
 * Her CLEANUP_INTERVAL_MINUTES dakikada bir çalışır.
 */
export function startCleanupTimer(): void {
    const intervalMs = CLEANUP_INTERVAL_MINUTES * 60 * 1000;

    setInterval(() => {
        cleanupOldData();
    }, intervalMs);

    console.log(`[Engine] Cleanup timer başlatıldı (her ${CLEANUP_INTERVAL_MINUTES} dakikada bir)`);
}

// Engine durumunu dışa açılan exports
export const engine = {
    addPrice,
    addHistoricalData,
    setTrackedCoins,
    isTracked,
    analyze,
    getStatus,
    getTotalRecords,
    cleanupOldData,
    startCleanupTimer,
};

export default engine;
