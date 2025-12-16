/**
 * Delta Hunter - Express API Server
 * Frontend'e analiz verisi sunar.
 * Başlangıçta bellek ısıtma yapar.
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { analyze, getStatus, getTotalRecords, startCleanupTimer } from './services/engine.js';
import { initializeMemory, startWebSocket, getFuturesSentiment } from './services/binance.js';
import { AnalysisRequest, AnalysisResult } from '../shared/types.js';
import { API_PORT, LOOKBACK_OPTIONS } from '../shared/constants.js';

// Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Server durumu
let isReady = false;

/**
 * POST /api/analyze
 * Frontend'den lookbackPeriodMinutes alır, analiz sonucu döner.
 */
app.post('/api/analyze', (req: Request, res: Response) => {
    try {
        if (!isReady) {
            res.status(503).json({
                error: 'Sunucu hazırlanıyor, lütfen bekleyin...',
            });
            return;
        }

        const body = req.body as AnalysisRequest;

        // Validation
        if (!body.lookbackPeriodMinutes || typeof body.lookbackPeriodMinutes !== 'number') {
            res.status(400).json({
                error: 'lookbackPeriodMinutes gerekli ve sayı olmalı',
            });
            return;
        }

        // Geçerli lookback değeri mi kontrol et
        if (body.lookbackPeriodMinutes < 1 || body.lookbackPeriodMinutes > 1440) {
            res.status(400).json({
                error: 'lookbackPeriodMinutes 1-1440 arasında olmalı',
            });
            return;
        }

        // Analiz yap
        const result: AnalysisResult = analyze(body.lookbackPeriodMinutes);

        res.json(result);
    } catch (error) {
        console.error('[API] Analyze hatası:', error);
        res.status(500).json({ error: 'Analiz sırasında hata oluştu' });
    }
});

/**
 * GET /api/status
 * Debug endpoint - engine durumunu gösterir.
 */
app.get('/api/status', (_req: Request, res: Response) => {
    try {
        const status = getStatus();
        res.json({
            ready: isReady,
            coins: status,
            totalCoins: status.length,
            totalRecords: getTotalRecords(),
            lookbackOptions: LOOKBACK_OPTIONS,
        });
    } catch (error) {
        console.error('[API] Status hatası:', error);
        res.status(500).json({ error: 'Status alınırken hata oluştu' });
    }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
        status: isReady ? 'ready' : 'warming',
        timestamp: Date.now(),
    });
});

/**
 * GET /api/sentiment/:symbol
 * Futures Top Trader Long/Short Ratio
 */
app.get('/api/sentiment/:symbol', async (req: Request, res: Response) => {
    try {
        const { symbol } = req.params;

        if (!symbol) {
            res.status(400).json({ error: 'Symbol parametresi gerekli' });
            return;
        }

        const sentiment = await getFuturesSentiment(symbol);

        if (!sentiment) {
            res.status(404).json({
                error: `${symbol} için Futures verisi bulunamadı`,
                symbol,
            });
            return;
        }

        res.json({
            symbol: symbol.toUpperCase(),
            ...sentiment,
        });
    } catch (error) {
        console.error('[API] Sentiment hatası:', error);
        res.status(500).json({ error: 'Sentiment verisi alınırken hata oluştu' });
    }
});

/**
 * Server'ı başlat
 */
async function startServer(): Promise<void> {
    // Express server'ı önce başlat (health check için)
    app.listen(API_PORT, () => {
        console.log('═══════════════════════════════════════════');
        console.log('   🎯 DELTA HUNTER Backend Başlatılıyor...');
        console.log('═══════════════════════════════════════════');
        console.log(`   📡 API: http://localhost:${API_PORT}`);
        console.log('   📊 Endpoints:');
        console.log('      POST /api/analyze - Analiz yap');
        console.log('      GET  /api/status  - Engine durumu');
        console.log('      GET  /api/health  - Health check');
        console.log('═══════════════════════════════════════════');
    });

    try {
        // 1. Bellek ısıtma (REST API'den geçmiş veri çek)
        await initializeMemory();

        // 2. Engine cleanup timer'ını başlat
        startCleanupTimer();

        // 3. WebSocket ile canlı takibi başlat
        startWebSocket();

        // 4. Sunucu hazır
        isReady = true;

        console.log('═══════════════════════════════════════════');
        console.log('   ✅ DELTA HUNTER HAZIR!');
        console.log(`   📊 Toplam Kayıt: ${getTotalRecords().toLocaleString()}`);
        console.log('═══════════════════════════════════════════');

    } catch (error) {
        console.error('[Server] Başlatma hatası:', error);
        process.exit(1);
    }
}

// Server'ı başlat
startServer();
