/**
 * Delta Hunter - Shared Types
 * Frontend ve Backend'in ortak dili.
 * TÜM interface'ler burada tanımlanır.
 */

// Tek bir coin'in anlık verisi
export interface CoinData {
    symbol: string;
    price: number;
    volume: number;
    delta: number; // TakerBuyVolume - TakerSellVolume (CVD hesaplaması için)
    timestamp: number;
}

// Frontend'den Backend'e gönderilen analiz isteği
export interface AnalysisRequest {
    lookbackPeriodMinutes: number;
}

// Tek bir coin için analiz sonucu
export interface CoinAnalysis {
    symbol: string;
    percentChange: number;
    currentPrice: number;
    oldPrice: number;
    // CVD Divergence (-100 ile +100 arası)
    // Negatif: Bearish Divergence (Fake Pump)
    // Pozitif: Bullish Divergence (Gizli Toplama)
    cvdDivergenceScore: number;
    deltaTrend: 'UP' | 'DOWN' | 'NEUTRAL';
    // AI Trade Signal (opsiyonel - sadece yüksek güvenilirlikte dolu)
    aiSignal?: TradeSetup;
}

// AI Trade Setup - Uzman Sistem Çıktısı
export interface TradeSetup {
    symbol: string;
    direction: 'LONG' | 'SHORT' | 'NONE';
    confidenceScore: number; // 0-100 arası
    reasons: string[]; // ["Likidite temizliği tespit edildi", "Balina alımı var"]
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    riskRewardRatio: number;
}

// Backend'den Frontend'e dönen analiz sonuçları
export interface AnalysisResult {
    timestamp: number;
    lookbackMinutes: number;
    gainers: CoinAnalysis[];  // En çok artanlar (sıralı)
    losers: CoinAnalysis[];   // En çok düşenler (sıralı)
}

// Uygulama ayarları için config tipi
export interface AppConfig {
    refreshIntervalMs: number;
    lookbackPeriodMinutes: number;
}

// Futures sentiment verisi (Deep Integration)
export interface SentimentData {
    symbol: string;
    timestamp: number;
    // Open Interest - Toplam açık pozisyon
    openInterest: number;
    // Top Trader Long/Short by Accounts (Top 20% trader hesap sayısı)
    topLongShortAccounts: number;
    // Top Trader Long/Short by Positions (Top 20% trader pozisyon büyüklüğü) - KRİTİK
    topLongShortPositions: number;
    // Global Long/Short Account Ratio (Tüm traderlar)
    globalLongShortRatio: number;
    // Taker Buy/Sell Volume Ratio (Piyasa emirleri oranı)
    takerBuySellRatio: number;
}
