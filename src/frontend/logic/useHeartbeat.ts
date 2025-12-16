/**
 * Delta Hunter - Heartbeat Hook
 * Otomatik yenileme döngüsü.
 * KURAL: refreshInterval süresine göre backend'e istek atar.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useCryptoStore } from './store';
import { AnalysisRequest, AnalysisResult } from '../../shared/types.js';
import { API_BASE_URL } from '../../shared/constants.js';

/**
 * Backend'den veri çek
 */
async function fetchAnalysis(lookbackMinutes: number): Promise<AnalysisResult> {
    const body: AnalysisRequest = { lookbackPeriodMinutes: lookbackMinutes };

    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`API hatası: ${response.status}`);
    }

    return response.json();
}

/**
 * Heartbeat Hook
 * Component mount olduğunda ve refreshInterval dolduğunda veri çeker.
 */
export function useHeartbeat(): void {
    const { config, setCoins, setLoading, setError } = useCryptoStore();
    const intervalRef = useRef<number | null>(null);

    // Veri çekme fonksiyonu
    const fetchData = useCallback(async () => {
        setLoading(true);

        try {
            const result = await fetchAnalysis(config.lookbackPeriod);

            // Gainers ve losers'ı birleştir
            // Gainers pozitif (en yüksekten), losers negatif (en düşükten)
            const allCoins = [...result.gainers, ...result.losers];

            setCoins(allCoins);
            console.log(`[Heartbeat] ${allCoins.length} coin güncellendi`);
        } catch (error) {
            console.error('[Heartbeat] Veri çekme hatası:', error);
            setError(error instanceof Error ? error.message : 'Bilinmeyen hata');
        }
    }, [config.lookbackPeriod, setCoins, setLoading, setError]);

    // İlk yüklemede ve config değiştiğinde
    useEffect(() => {
        // İlk veriyi hemen çek (ekran boş kalmasın)
        fetchData();

        // Önceki interval'i temizle
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        // Yeni interval kur
        intervalRef.current = window.setInterval(() => {
            fetchData();
        }, config.refreshInterval);

        console.log(`[Heartbeat] Interval kuruldu: ${config.refreshInterval / 1000}s`);

        // Cleanup
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                console.log('[Heartbeat] Interval temizlendi');
            }
        };
    }, [config.refreshInterval, fetchData]);
}

export default useHeartbeat;
