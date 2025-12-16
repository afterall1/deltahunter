/**
 * Delta Hunter - Risk Calculator
 * Profesyonel pozisyon boyutu hesaplayıcı.
 * Kullanıcının portföy büyüklüğü ve risk toleransına göre
 * matematiksel olarak doğru pozisyon boyutu hesaplar.
 */

export interface PositionSizeResult {
    positionSize: number;      // Kaç adet coin
    positionValue: number;     // Toplam pozisyon değeri ($)
    riskAmount: number;        // Risk edilen miktar ($)
    recommendedLeverage: number; // Önerilen kaldıraç
    marginRequired: number;    // Gerekli margin ($)
}

/**
 * Pozisyon boyutunu hesapla
 * @param portfolioSize - Toplam portföy değeri ($)
 * @param riskPercentage - Her işlemde riske atılacak yüzde (örn: 1 = %1)
 * @param entryPrice - Giriş fiyatı
 * @param stopLoss - Stop loss fiyatı
 * @returns Pozisyon boyutu ve detayları
 */
export function calculatePositionSize(
    portfolioSize: number,
    riskPercentage: number,
    entryPrice: number,
    stopLoss: number
): PositionSizeResult {
    // Risk edilen miktar (örn: 10000$ portföy, %1 risk = 100$ risk)
    const riskAmount = portfolioSize * (riskPercentage / 100);

    // Stop loss mesafesi ($ cinsinden)
    const stopDistance = Math.abs(entryPrice - stopLoss);

    // Pozisyon boyutu (kaç adet coin)
    // Risk = Adet × StopMesafesi → Adet = Risk / StopMesafesi
    const positionSize = stopDistance > 0 ? riskAmount / stopDistance : 0;

    // Toplam pozisyon değeri
    const positionValue = positionSize * entryPrice;

    // Kaldıraç hesabı
    // Eğer pozisyon değeri portföyden büyükse, kaldıraç gerekir
    let recommendedLeverage = 1;
    if (positionValue > portfolioSize) {
        recommendedLeverage = Math.ceil(positionValue / portfolioSize);
        // Makul kaldıraç limiti (max 20x)
        recommendedLeverage = Math.min(recommendedLeverage, 20);
    }

    // Gerekli margin
    const marginRequired = positionValue / recommendedLeverage;

    return {
        positionSize,
        positionValue,
        riskAmount,
        recommendedLeverage,
        marginRequired,
    };
}

/**
 * Formatla: Büyük sayıları kısalt
 */
export function formatCurrency(value: number): string {
    if (value >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(2)}M`;
    }
    if (value >= 1_000) {
        return `$${(value / 1_000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
}

/**
 * Formatla: Coin miktarını formatla
 */
export function formatQuantity(quantity: number, symbol: string): string {
    const displaySymbol = symbol.replace('USDT', '');

    if (quantity >= 1_000_000) {
        return `${(quantity / 1_000_000).toFixed(2)}M ${displaySymbol}`;
    }
    if (quantity >= 1_000) {
        return `${(quantity / 1_000).toFixed(2)}K ${displaySymbol}`;
    }
    if (quantity >= 1) {
        return `${quantity.toFixed(2)} ${displaySymbol}`;
    }
    return `${quantity.toFixed(6)} ${displaySymbol}`;
}

export default { calculatePositionSize, formatCurrency, formatQuantity };
