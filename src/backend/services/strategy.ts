/**
 * Delta Hunter - Strategy Engine (THE BRAIN)
 * Trinity Protocol: Liquidity Sweep + CVD Divergence + Risk Management
 * Sadece yüksek olasılıklı trade sinyalleri üretir.
 * KURAL: Rastgele sinyal YOK - sadece balinalar tuzak kurduğunda sinyal.
 */

import { CoinData, TradeSetup } from '../../shared/types.js';

// Strategy parametreleri
const MIN_CONFIDENCE_SCORE = 80; // Minimum güvenilirlik skoru
const RISK_REWARD_RATIO = 3; // R/R oranı
const STOP_LOSS_BUFFER = 0.005; // %0.5 buffer
const MAX_VOLATILITY_THRESHOLD = 0.15; // %15 üstü volatilite = geçersiz

interface PriceExtreme {
    low: number;
    high: number;
    lowTimestamp: number;
    highTimestamp: number;
}

/**
 * Son 4 saatlik veride en düşük ve en yüksek fiyatları bul
 */
function findPriceExtremes(history: CoinData[], periodMinutes: number = 240): PriceExtreme | null {
    if (history.length < 20) return null;

    const cutoffTime = Date.now() - (periodMinutes * 60 * 1000);
    const relevantData = history.filter(d => d.timestamp >= cutoffTime);

    if (relevantData.length < 10) return null;

    let low = Infinity;
    let high = -Infinity;
    let lowTimestamp = 0;
    let highTimestamp = 0;

    for (const data of relevantData) {
        if (data.price < low) {
            low = data.price;
            lowTimestamp = data.timestamp;
        }
        if (data.price > high) {
            high = data.price;
            highTimestamp = data.timestamp;
        }
    }

    return { low, high, lowTimestamp, highTimestamp };
}

/**
 * Liquidity Sweep tespit et (Swing Failure Pattern)
 * Fiyat son düşüğü/yükseği kırdı ama hemen geri döndü mü?
 */
function detectLiquiditySweep(
    history: CoinData[],
    extremes: PriceExtreme,
    currentPrice: number
): { detected: boolean; direction: 'LONG' | 'SHORT' | 'NONE'; sweepLevel: number } {
    if (history.length < 5) {
        return { detected: false, direction: 'NONE', sweepLevel: 0 };
    }

    const recentData = history.slice(-10); // Son 10 veri
    const tolerance = 0.002; // %0.2 tolerans

    // BULLISH SWEEP: Son düşüğün altına indi ama tekrar yukarı attı
    let wentBelowLow = false;
    for (const data of recentData) {
        if (data.price < extremes.low * (1 - tolerance)) {
            wentBelowLow = true;
            break;
        }
    }

    if (wentBelowLow && currentPrice > extremes.low * (1 + tolerance)) {
        return { detected: true, direction: 'LONG', sweepLevel: extremes.low };
    }

    // BEARISH SWEEP: Son yükseklerinin üzerine çıktı ama tekrar aşağı geldi
    let wentAboveHigh = false;
    for (const data of recentData) {
        if (data.price > extremes.high * (1 + tolerance)) {
            wentAboveHigh = true;
            break;
        }
    }

    if (wentAboveHigh && currentPrice < extremes.high * (1 - tolerance)) {
        return { detected: true, direction: 'SHORT', sweepLevel: extremes.high };
    }

    return { detected: false, direction: 'NONE', sweepLevel: 0 };
}

/**
 * Risk/Reward hesapla
 */
function calculateRiskReward(
    direction: 'LONG' | 'SHORT',
    entryPrice: number,
    sweepLevel: number
): { stopLoss: number; takeProfit: number; rr: number; valid: boolean } {
    const buffer = entryPrice * STOP_LOSS_BUFFER;

    let stopLoss: number;
    let takeProfit: number;

    if (direction === 'LONG') {
        // LONG: Stop sweep level'ın altında
        stopLoss = sweepLevel - buffer;
        const riskAmount = entryPrice - stopLoss;
        takeProfit = entryPrice + (riskAmount * RISK_REWARD_RATIO);
    } else {
        // SHORT: Stop sweep level'ın üstünde
        stopLoss = sweepLevel + buffer;
        const riskAmount = stopLoss - entryPrice;
        takeProfit = entryPrice - (riskAmount * RISK_REWARD_RATIO);
    }

    const rr = RISK_REWARD_RATIO;

    // Volatilite kontrolü - TP çok uzakta mı?
    const tpDistance = Math.abs(takeProfit - entryPrice) / entryPrice;
    const valid = tpDistance <= MAX_VOLATILITY_THRESHOLD;

    return { stopLoss, takeProfit, rr, valid };
}

/**
 * MAIN: Trade pozisyonunu değerlendir (Trinity Protocol)
 * @param currentPrice - Güncel fiyat
 * @param cvdScore - CVD Divergence skoru (-100 to +100)
 * @param history - Fiyat geçmişi
 */
export function evaluatePosition(
    symbol: string,
    currentPrice: number,
    cvdScore: number,
    history: CoinData[]
): TradeSetup {
    const noSignal: TradeSetup = {
        symbol,
        direction: 'NONE',
        confidenceScore: 0,
        reasons: [],
        entryPrice: currentPrice,
        stopLoss: 0,
        takeProfit: 0,
        riskRewardRatio: 0,
    };

    // Yeterli veri var mı?
    if (history.length < 50) {
        return noSignal;
    }

    let confidenceScore = 0;
    const reasons: string[] = [];

    // === ADIM 1: Liquidity Sweep Tespiti ===
    const extremes = findPriceExtremes(history, 240); // 4 saat
    if (!extremes) {
        return noSignal;
    }

    const sweep = detectLiquiditySweep(history, extremes, currentPrice);

    if (!sweep.detected) {
        return noSignal; // Sweep yoksa sinyal yok
    }

    confidenceScore += 40;
    reasons.push(`Likidite temizliği tespit: ${sweep.direction} @ ${sweep.sweepLevel.toFixed(4)}`);

    // === ADIM 2: CVD Divergence Doğrulaması ===
    // LONG için: Fiyat düştü ama CVD pozitif (gizli alım)
    // SHORT için: Fiyat çıktı ama CVD negatif (gizli satış)

    if (sweep.direction === 'LONG') {
        if (cvdScore > 30) {
            confidenceScore += 35;
            reasons.push(`CVD Divergence: Gizli alım tespit (Skor: ${cvdScore})`);
        } else if (cvdScore > 0) {
            confidenceScore += 15;
            reasons.push(`CVD: Hafif alıcı baskısı (Skor: ${cvdScore})`);
        } else {
            // CVD negatif = alıcı yok, sinyal zayıf
            confidenceScore -= 20;
        }
    } else if (sweep.direction === 'SHORT') {
        if (cvdScore < -30) {
            confidenceScore += 35;
            reasons.push(`CVD Divergence: Gizli satış tespit (Skor: ${cvdScore})`);
        } else if (cvdScore < 0) {
            confidenceScore += 15;
            reasons.push(`CVD: Hafif satıcı baskısı (Skor: ${cvdScore})`);
        } else {
            // CVD pozitif = satıcı yok, sinyal zayıf
            confidenceScore -= 20;
        }
    }

    // === ADIM 3: Risk/Reward Hesabı ===
    // Bu noktada direction kesinlikle 'LONG' veya 'SHORT' çünkü sweep.detected = true
    const riskCalc = calculateRiskReward(
        sweep.direction as 'LONG' | 'SHORT',
        currentPrice,
        sweep.sweepLevel
    );

    if (!riskCalc.valid) {
        reasons.push('Volatilite çok yüksek, trade iptal');
        return { ...noSignal, confidenceScore, reasons };
    }

    confidenceScore += 25;
    reasons.push(`R/R Oranı: ${riskCalc.rr}:1`);

    // === SONUÇ ===
    if (confidenceScore < MIN_CONFIDENCE_SCORE) {
        return {
            ...noSignal,
            confidenceScore,
            reasons,
        };
    }

    // Yüksek güvenilirlik - tam sinyal dön
    return {
        symbol,
        direction: sweep.direction,
        confidenceScore: Math.min(100, confidenceScore),
        reasons,
        entryPrice: currentPrice,
        stopLoss: riskCalc.stopLoss,
        takeProfit: riskCalc.takeProfit,
        riskRewardRatio: riskCalc.rr,
    };
}

/**
 * Exports
 */
export const strategy = {
    evaluatePosition,
};

export default strategy;
