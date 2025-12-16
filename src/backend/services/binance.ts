/**
 * Delta Hunter - Binance Service
 * REST API ile bellek ısıtma + WebSocket ile canlı takip.
 * Dinamik olarak Top 150 USDT coin takibi.
 */

import { addPrice, addHistoricalData, setTrackedCoins, isTracked } from './engine.js';
import {
    MAX_TRACKED_COINS,
    KLINE_LIMIT,
    BINANCE_REST_URL,
    WARMUP_PROGRESS_INTERVAL,
} from '../../shared/constants.js';

// WebSocket bağlantısı
let ws: WebSocket | null = null;

// Takip edilen coin listesi
let topCoins: string[] = [];

/**
 * Binance REST API'den veri çek
 */
async function fetchJSON(endpoint: string): Promise<any> {
    const response = await fetch(`${BINANCE_REST_URL}${endpoint}`);
    if (!response.ok) {
        throw new Error(`Binance API hatası: ${response.status}`);
    }
    return response.json();
}

/**
 * Top 150 USDT coin listesini çek (hacme göre sıralı)
 */
async function fetchTopCoins(): Promise<string[]> {
    console.log('[Binance] Top coinler çekiliyor...');

    const tickers = await fetchJSON('/api/v3/ticker/24hr');

    // Sadece USDT paritelerini filtrele ve hacme göre sırala
    const usdtPairs = tickers
        .filter((t: any) => t.symbol.endsWith('USDT'))
        .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
        .slice(0, MAX_TRACKED_COINS)
        .map((t: any) => t.symbol);

    console.log(`[Binance] ${usdtPairs.length} USDT coin bulundu`);
    return usdtPairs;
}

/**
 * Tek bir coin için 24 saatlik kline (mum) verisini çek
 */
async function fetchKlines(symbol: string): Promise<any[]> {
    const endpoint = `/api/v3/klines?symbol=${symbol}&interval=1m&limit=${KLINE_LIMIT}`;
    return fetchJSON(endpoint);
}

/**
 * Bellek Isıtma (Pre-warming)
 * Sunucu başlangıcında 24 saatlik geçmiş veriyi yükler.
 */
export async function initializeMemory(): Promise<void> {
    console.log('═══════════════════════════════════════════');
    console.log('   🔥 BELLEK ISITMA BAŞLADI');
    console.log('═══════════════════════════════════════════');

    const startTime = Date.now();

    // 1. Top coinleri çek
    topCoins = await fetchTopCoins();
    setTrackedCoins(topCoins);

    // 2. Her coin için geçmiş veriyi çek
    console.log(`[Binance] ${topCoins.length} coin için geçmiş veri çekiliyor...`);
    console.log('[Binance] Bu işlem birkaç dakika sürebilir...');

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < topCoins.length; i++) {
        const symbol = topCoins[i];

        try {
            const klines = await fetchKlines(symbol);
            addHistoricalData(symbol, klines);
            successCount++;

            // Progress göster
            if ((i + 1) % WARMUP_PROGRESS_INTERVAL === 0 || i === topCoins.length - 1) {
                const percent = Math.round(((i + 1) / topCoins.length) * 100);
                console.log(`[Binance] Isıtma: ${i + 1}/${topCoins.length} (${percent}%) - ${symbol}`);
            }

            // Rate limit: Her istek arasında 50ms bekle
            await new Promise(resolve => setTimeout(resolve, 50));

        } catch (error) {
            console.error(`[Binance] ${symbol} kline hatası:`, error);
            errorCount++;
        }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('═══════════════════════════════════════════');
    console.log(`   ✅ BELLEK ISITMA TAMAMLANDI`);
    console.log(`   📊 Başarılı: ${successCount} | Hata: ${errorCount}`);
    console.log(`   ⏱️ Süre: ${duration} saniye`);
    console.log('═══════════════════════════════════════════');
}

/**
 * WebSocket ile canlı fiyat takibi başlat
 * !ticker@arr stream'i tüm marketlerin anlık verilerini gönderir.
 */
export function startWebSocket(): void {
    console.log('[Binance] WebSocket bağlantısı kuruluyor...');

    // Tüm marketler için mini ticker stream
    const wsUrl = 'wss://stream.binance.com:9443/ws/!ticker@arr';

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('[Binance] WebSocket bağlandı (All Market Tickers)');
    };

    ws.onmessage = (event) => {
        try {
            const tickers = JSON.parse(event.data);

            for (const ticker of tickers) {
                const symbol = ticker.s;

                // Sadece USDT ve takip listesindeki coinleri işle
                if (symbol.endsWith('USDT') && isTracked(symbol)) {
                    const price = parseFloat(ticker.c); // close price
                    const totalVolume = parseFloat(ticker.v); // 24h base asset volume
                    const takerBuyVolume = parseFloat(ticker.Q); // quote volume (yaklaşık taker buy göstergesi)

                    // Delta hesapla: Taker Buy - Taker Sell
                    // !ticker@arr'da direkt taker buy yok, ama price change yönünü kullanabiliriz
                    // Basit yaklaşım: priceChangePercent pozitifse alıcılar baskın
                    const priceChangePercent = parseFloat(ticker.P) || 0;

                    // Delta = Volume * (priceChange sign ile ağırlıklı)
                    // Pozitif price change = alıcı baskın (pozitif delta)
                    // Negatif price change = satıcı baskın (negatif delta)
                    const deltaSign = priceChangePercent >= 0 ? 1 : -1;
                    const delta = totalVolume * 0.01 * deltaSign * Math.abs(priceChangePercent);

                    if (!isNaN(price) && price > 0) {
                        addPrice(symbol, price, totalVolume, delta);
                    }
                }
            }
        } catch (error) {
            // Parsing hatalarını sessizce yoksay
        }
    };

    ws.onerror = (error) => {
        console.error('[Binance] WebSocket hatası:', error);
    };

    ws.onclose = () => {
        console.log('[Binance] WebSocket kapandı, yeniden bağlanılıyor...');
        // 5 saniye sonra yeniden bağlan
        setTimeout(() => startWebSocket(), 5000);
    };
}

/**
 * WebSocket bağlantısını kapat
 */
export function stopWebSocket(): void {
    if (ws) {
        ws.close();
        ws = null;
        console.log('[Binance] WebSocket bağlantısı kapatıldı');
    }
}

// Binance Futures API URL
const BINANCE_FUTURES_URL = 'https://fapi.binance.com';

/**
 * Tek bir Futures API endpoint'inden veri çek
 * Hata durumunda null döner
 */
async function fetchFuturesData(endpoint: string): Promise<any> {
    try {
        const response = await fetch(`${BINANCE_FUTURES_URL}${endpoint}`);
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    }
}

/**
 * Futures verilerini paralel çek (Deep Integration)
 * 5 farklı veriyi Promise.all ile aynı anda çeker
 */
export async function getFuturesSentiment(symbol: string): Promise<{
    symbol: string;
    timestamp: number;
    openInterest: number;
    topLongShortAccounts: number;
    topLongShortPositions: number;
    globalLongShortRatio: number;
    takerBuySellRatio: number;
} | null> {
    try {
        const cleanSymbol = symbol.toUpperCase();
        const period = '4h';
        const limit = 1;

        // 5 API çağrısını paralel yap
        const [
            openInterestData,
            topAccountsData,
            topPositionsData,
            globalRatioData,
            takerRatioData,
        ] = await Promise.all([
            // 1. Open Interest (anlık, period yok)
            fetchFuturesData(`/fapi/v1/openInterest?symbol=${cleanSymbol}`),

            // 2. Top Trader Long/Short by Accounts
            fetchFuturesData(`/futures/data/topLongShortAccountRatio?symbol=${cleanSymbol}&period=${period}&limit=${limit}`),

            // 3. Top Trader Long/Short by Positions (KRİTİK - Balina pozisyonları)
            fetchFuturesData(`/futures/data/topLongShortPositionRatio?symbol=${cleanSymbol}&period=${period}&limit=${limit}`),

            // 4. Global Long/Short Account Ratio
            fetchFuturesData(`/futures/data/globalLongShortAccountRatio?symbol=${cleanSymbol}&period=${period}&limit=${limit}`),

            // 5. Taker Buy/Sell Volume Ratio
            fetchFuturesData(`/futures/data/takerlongshortRatio?symbol=${cleanSymbol}&period=${period}&limit=${limit}`),
        ]);

        // Veri parse - null kontrolü ile
        const openInterest = openInterestData
            ? parseFloat(openInterestData.openInterest) || 0
            : 0;

        const topLongShortAccounts = topAccountsData?.[0]
            ? parseFloat(topAccountsData[0].longShortRatio) || 0
            : 0;

        const topLongShortPositions = topPositionsData?.[0]
            ? parseFloat(topPositionsData[0].longShortRatio) || 0
            : 0;

        const globalLongShortRatio = globalRatioData?.[0]
            ? parseFloat(globalRatioData[0].longShortRatio) || 0
            : 0;

        const takerBuySellRatio = takerRatioData?.[0]
            ? parseFloat(takerRatioData[0].buySellRatio) || 0
            : 0;

        // Timestamp - en son veriden al
        const timestamp = topAccountsData?.[0]?.timestamp || Date.now();

        // Tüm veriler 0 ise muhtemelen Futures'ta yok
        if (openInterest === 0 && topLongShortAccounts === 0 && topLongShortPositions === 0) {
            console.log(`[Binance Futures] ${cleanSymbol} için Futures verisi bulunamadı`);
            return null;
        }

        return {
            symbol: cleanSymbol,
            timestamp,
            openInterest,
            topLongShortAccounts,
            topLongShortPositions,
            globalLongShortRatio,
            takerBuySellRatio,
        };

    } catch (error) {
        console.error(`[Binance Futures] ${symbol} sentiment hatası:`, error);
        return null;
    }
}

/**
 * Servis exports
 */
export const binanceService = {
    initializeMemory,
    startWebSocket,
    stopWebSocket,
    getTopCoins: () => topCoins,
    getFuturesSentiment,
};

export default binanceService;
