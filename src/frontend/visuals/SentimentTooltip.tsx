/**
 * Delta Hunter - Sentiment Tooltip Component
 * Professional HUD panel with Futures data analysis.
 * Shows Open Interest, Whale Positions, Global Ratio, and Trap Detection.
 */

import { useState, useEffect } from 'react';
import { Html } from '@react-three/drei';

interface SentimentTooltipProps {
    symbol: string;
    visible: boolean;
    cvdScore?: number; // -100 to +100 from backend
}

interface SentimentData {
    symbol: string;
    timestamp: number;
    openInterest: number;
    topLongShortAccounts: number;
    topLongShortPositions: number;
    globalLongShortRatio: number;
    takerBuySellRatio: number;
}

// Format large numbers (345,000,000 -> 345M)
function formatNumber(num: number): string {
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
    return num.toFixed(2);
}

// Analyze for manipulation signals
function analyzeManipulation(data: SentimentData): { signal: string; color: string; description: string } {
    const whalePositions = data.topLongShortPositions;
    const globalRatio = data.globalLongShortRatio;
    const takerRatio = data.takerBuySellRatio;

    // WHALE TRAP: Whales short while retail is long
    if (whalePositions < 0.8 && globalRatio > 1.2) {
        return {
            signal: '⚠ WHALE TRAP DETECTED',
            color: '#ff4444',
            description: 'Whales Short, Retail Long',
        };
    }

    // SHORT SQUEEZE: Whales long while retail is short
    if (whalePositions > 1.5 && globalRatio < 0.8) {
        return {
            signal: '🚀 SHORT SQUEEZE SETUP',
            color: '#00ff00',
            description: 'Whales Long, Retail Short',
        };
    }

    // EXTREME LONG: Everyone is long
    if (whalePositions > 2.0 && globalRatio > 2.0) {
        return {
            signal: '📈 EXTREME LONG BIAS',
            color: '#ffaa00',
            description: 'Market Overheated',
        };
    }

    // EXTREME SHORT: Everyone is short
    if (whalePositions < 0.5 && globalRatio < 0.5) {
        return {
            signal: '📉 EXTREME SHORT BIAS',
            color: '#ffaa00',
            description: 'Potential Reversal',
        };
    }

    // STRONG BUY PRESSURE: Taker buyers dominating
    if (takerRatio > 1.2) {
        return {
            signal: '💪 STRONG BUY PRESSURE',
            color: '#88ff88',
            description: 'Taker Buy Dominant',
        };
    }

    // STRONG SELL PRESSURE: Taker sellers dominating
    if (takerRatio < 0.8) {
        return {
            signal: '📉 SELL PRESSURE',
            color: '#ff8888',
            description: 'Taker Sell Dominant',
        };
    }

    return {
        signal: '⚖ NEUTRAL',
        color: '#888888',
        description: 'No Clear Signal',
    };
}

// Analyze CVD Signal
function analyzeCVD(score: number | undefined): { signal: string; color: string } | null {
    if (score === undefined || Math.abs(score) < 50) return null;

    if (score < -50) {
        return { signal: '⚠ FAKE PUMP (AVOID)', color: '#ff4500' };
    }
    if (score > 50) {
        return { signal: '✅ ACCUMULATION (BUY)', color: '#00ffff' };
    }
    return null;
}

export function SentimentTooltip({ symbol, visible, cvdScore }: SentimentTooltipProps) {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<SentimentData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!visible) {
            setData(null);
            setError(null);
            return;
        }

        const fetchSentiment = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/sentiment/${symbol}`);

                if (!response.ok) {
                    setError('N/A');
                    return;
                }

                const result = await response.json();
                setData(result);
            } catch {
                setError('N/A');
            } finally {
                setLoading(false);
            }
        };

        fetchSentiment();
    }, [visible, symbol]);

    if (!visible) return null;

    const displaySymbol = symbol.replace('USDT', '');
    const analysis = data ? analyzeManipulation(data) : null;

    return (
        <Html center style={{ pointerEvents: 'none' }}>
            <div style={styles.container}>
                {/* Scanline effect */}
                <div style={styles.scanline} />

                {/* Header */}
                <div style={styles.header}>
                    <span style={styles.headerIcon}>◆</span>
                    <span style={styles.headerSymbol}>{displaySymbol}</span>
                    <span style={styles.headerPeriod}>4H ANALYSIS</span>
                </div>

                {/* Content */}
                <div style={styles.content}>
                    {loading && (
                        <div style={styles.loading}>
                            <div style={styles.loadingBar} />
                            <span>SCANNING FUTURES DATA...</span>
                        </div>
                    )}

                    {error && <div style={styles.error}>NO FUTURES DATA</div>}

                    {data && !loading && (
                        <>
                            {/* Data Grid */}
                            <div style={styles.grid}>
                                {/* Open Interest */}
                                <div style={styles.row}>
                                    <div style={styles.labelCell}>
                                        <span style={styles.labelIcon}>📊</span>
                                        <span style={styles.label}>OPEN INTEREST</span>
                                    </div>
                                    <div style={styles.valueCell}>
                                        <span style={styles.value}>{formatNumber(data.openInterest)}</span>
                                    </div>
                                </div>

                                {/* Whale Positions */}
                                <div style={styles.row}>
                                    <div style={styles.labelCell}>
                                        <span style={styles.labelIcon}>🐋</span>
                                        <span style={styles.label}>WHALE L/S</span>
                                        <span style={styles.sublabel}>(Top 20%)</span>
                                    </div>
                                    <div style={styles.valueCell}>
                                        <span style={{
                                            ...styles.value,
                                            color: data.topLongShortPositions > 1.2 ? '#00ff00' :
                                                data.topLongShortPositions < 0.8 ? '#ff4444' : '#ffffff'
                                        }}>
                                            {data.topLongShortPositions.toFixed(4)}
                                        </span>
                                    </div>
                                </div>

                                {/* Global Ratio */}
                                <div style={styles.row}>
                                    <div style={styles.labelCell}>
                                        <span style={styles.labelIcon}>👥</span>
                                        <span style={styles.label}>RETAIL L/S</span>
                                        <span style={styles.sublabel}>(Global)</span>
                                    </div>
                                    <div style={styles.valueCell}>
                                        <span style={{
                                            ...styles.value,
                                            color: data.globalLongShortRatio > 1.5 ? '#ffaa00' :
                                                data.globalLongShortRatio < 0.67 ? '#88ff88' : '#ffffff'
                                        }}>
                                            {data.globalLongShortRatio.toFixed(4)}
                                        </span>
                                    </div>
                                </div>

                                {/* Taker Ratio */}
                                <div style={styles.row}>
                                    <div style={styles.labelCell}>
                                        <span style={styles.labelIcon}>⚡</span>
                                        <span style={styles.label}>TAKER B/S</span>
                                        <span style={styles.sublabel}>(Volume)</span>
                                    </div>
                                    <div style={styles.valueCell}>
                                        <span style={{
                                            ...styles.value,
                                            color: data.takerBuySellRatio > 1.1 ? '#00ff00' :
                                                data.takerBuySellRatio < 0.9 ? '#ff4444' : '#ffffff'
                                        }}>
                                            {data.takerBuySellRatio.toFixed(4)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div style={styles.divider} />

                            {/* CVD Signal (if available) */}
                            {analyzeCVD(cvdScore) && (
                                <div style={{
                                    ...styles.cvdBox,
                                    borderColor: analyzeCVD(cvdScore)!.color,
                                    boxShadow: `0 0 15px ${analyzeCVD(cvdScore)!.color}40`,
                                }}>
                                    <span style={styles.cvdLabel}>📉 CVD SIGNAL</span>
                                    <span style={{ ...styles.cvdValue, color: analyzeCVD(cvdScore)!.color }}>
                                        {analyzeCVD(cvdScore)!.signal}
                                    </span>
                                </div>
                            )}

                            {/* Divider */}
                            <div style={styles.divider} />

                            {/* Smart Signal */}
                            <div style={{
                                ...styles.signalBox,
                                borderColor: analysis?.color,
                                boxShadow: `0 0 15px ${analysis?.color}40`,
                            }}>
                                <span style={{ ...styles.signalText, color: analysis?.color }}>
                                    {analysis?.signal}
                                </span>
                                <span style={styles.signalDescription}>
                                    {analysis?.description}
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div style={styles.footer}>
                    <span>BINANCE FUTURES • LIVE</span>
                </div>
            </div>
        </Html>
    );
}

// Glassmorphism + Cyberpunk Styles
const styles: { [key: string]: React.CSSProperties } = {
    container: {
        width: '280px',
        backgroundColor: 'rgba(5, 10, 25, 0.92)',
        border: '1px solid rgba(0, 255, 255, 0.5)',
        borderRadius: '6px',
        fontFamily: "'Courier New', monospace",
        fontSize: '11px',
        color: '#ffffff',
        boxShadow: '0 0 30px rgba(0, 255, 255, 0.2), inset 0 0 30px rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(10px)',
        overflow: 'hidden',
        position: 'relative',
    },
    scanline: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 2px)',
        pointerEvents: 'none',
        opacity: 0.3,
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 12px',
        backgroundColor: 'rgba(0, 255, 255, 0.08)',
        borderBottom: '1px solid rgba(0, 255, 255, 0.3)',
    },
    headerIcon: {
        color: '#00ffff',
        fontSize: '14px',
        textShadow: '0 0 10px #00ffff',
    },
    headerSymbol: {
        color: '#00ffff',
        fontWeight: 'bold',
        fontSize: '14px',
        letterSpacing: '2px',
        textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
    },
    headerPeriod: {
        marginLeft: 'auto',
        color: '#666',
        fontSize: '10px',
        letterSpacing: '1px',
    },
    content: {
        padding: '12px',
    },
    loading: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        padding: '20px 0',
        color: '#00ffff',
        fontSize: '10px',
    },
    loadingBar: {
        width: '80%',
        height: '4px',
        backgroundColor: 'rgba(0, 255, 255, 0.2)',
        borderRadius: '2px',
        position: 'relative',
        overflow: 'hidden',
    },
    error: {
        textAlign: 'center',
        color: '#666',
        padding: '20px 0',
    },
    grid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    row: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 8px',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '4px',
        borderLeft: '2px solid rgba(0, 255, 255, 0.3)',
    },
    labelCell: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    labelIcon: {
        fontSize: '12px',
    },
    label: {
        color: '#aaa',
        fontSize: '10px',
        letterSpacing: '0.5px',
    },
    sublabel: {
        color: '#555',
        fontSize: '8px',
        marginLeft: '4px',
    },
    valueCell: {
        textAlign: 'right',
    },
    value: {
        fontWeight: 'bold',
        fontSize: '13px',
        letterSpacing: '0.5px',
    },
    divider: {
        height: '1px',
        backgroundColor: 'rgba(0, 255, 255, 0.15)',
        margin: '12px 0',
    },
    signalBox: {
        padding: '10px 12px',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        border: '1px solid',
        borderRadius: '4px',
        textAlign: 'center',
    },
    signalText: {
        display: 'block',
        fontWeight: 'bold',
        fontSize: '12px',
        letterSpacing: '1px',
        marginBottom: '4px',
        textShadow: '0 0 10px currentColor',
    },
    signalDescription: {
        color: '#666',
        fontSize: '9px',
        letterSpacing: '0.5px',
    },
    cvdBox: {
        padding: '8px 10px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        border: '1px solid',
        borderRadius: '4px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cvdLabel: {
        color: '#888',
        fontSize: '9px',
        letterSpacing: '0.5px',
    },
    cvdValue: {
        fontWeight: 'bold',
        fontSize: '10px',
        letterSpacing: '0.5px',
        textShadow: '0 0 8px currentColor',
    },
    footer: {
        padding: '8px 12px',
        borderTop: '1px solid rgba(0, 255, 255, 0.1)',
        backgroundColor: 'rgba(0, 255, 255, 0.03)',
        textAlign: 'center',
        color: '#444',
        fontSize: '8px',
        letterSpacing: '1px',
    },
};

export default SentimentTooltip;
