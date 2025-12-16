/**
 * Delta Hunter - Holographic Signal Card
 * AI Trade sinyalleri için profesyonel analiz kartı.
 * 3 sütunlu layout: Logo/Yön | Analiz | Risk Yönetimi
 */

import React, { useState, useMemo } from 'react';
import { TradeSetup } from '../../shared/types.js';
import { calculatePositionSize, formatCurrency, formatQuantity } from '../logic/riskCalculator.js';

interface SignalCardProps {
    setup: TradeSetup;
    onClose: () => void;
}

export function SignalCard({ setup, onClose }: SignalCardProps) {
    const [portfolioSize, setPortfolioSize] = useState<number>(10000);
    const riskPercentage = 1;

    const isLong = setup.direction === 'LONG';
    const directionColor = isLong ? '#00ff00' : '#ff4444';

    // Pozisyon hesaplama
    const position = useMemo(() => {
        return calculatePositionSize(
            portfolioSize,
            riskPercentage,
            setup.entryPrice,
            setup.stopLoss
        );
    }, [portfolioSize, setup.entryPrice, setup.stopLoss]);

    // Binance trade linki
    const tradeUrl = `https://www.binance.com/en/futures/${setup.symbol}`;

    const handleExecute = () => {
        window.open(tradeUrl, '_blank');
    };

    // Analiz kontrolleri parse et
    const hasLiquiditySweep = setup.reasons.some(r => r.toLowerCase().includes('likidite'));
    const hasCVDDivergence = setup.reasons.some(r => r.toLowerCase().includes('cvd'));
    const hasWhaleActivity = setup.reasons.some(r => r.toLowerCase().includes('balina') || r.toLowerCase().includes('whale'));

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.card} onClick={(e) => e.stopPropagation()}>
                {/* Scanline Effect */}
                <div style={styles.scanline} />

                {/* Close Button */}
                <button style={styles.closeBtn} onClick={onClose}>✕</button>

                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.headerBadge}>🧠 AI STRATEGY REPORT</div>
                    <div style={styles.headerSymbol}>{setup.symbol}</div>
                    <div style={styles.confidenceBadge}>
                        {setup.confidenceScore}% CONFIDENCE
                    </div>
                </div>

                {/* 3 Column Layout */}
                <div style={styles.content}>
                    {/* LEFT: Direction */}
                    <div style={styles.leftColumn}>
                        <div style={styles.directionBox}>
                            <div style={{
                                ...styles.directionArrow,
                                color: directionColor,
                            }}>
                                {isLong ? '▲' : '▼'}
                            </div>
                            <div style={{
                                ...styles.directionText,
                                color: directionColor,
                            }}>
                                {setup.direction}
                            </div>
                            <div style={styles.directionLabel}>
                                {isLong ? 'BUY SIGNAL' : 'SELL SIGNAL'}
                            </div>
                        </div>
                    </div>

                    {/* CENTER: Analysis Checklist */}
                    <div style={styles.centerColumn}>
                        <div style={styles.sectionTitle}>📊 ANALYSIS CHECKLIST</div>
                        <div style={styles.checkList}>
                            <CheckItem
                                label="Liquidity Sweep"
                                checked={hasLiquiditySweep}
                                description="Fiyat, destek/direnci temizledi ve geri döndü"
                            />
                            <CheckItem
                                label="CVD Divergence"
                                checked={hasCVDDivergence}
                                description="Hacim-fiyat uyumsuzluğu tespit edildi"
                            />
                            <CheckItem
                                label="Whale Activity"
                                checked={hasWhaleActivity}
                                description="Büyük oyuncu hareketi var"
                            />
                            <CheckItem
                                label="R/R > 3"
                                checked={setup.riskRewardRatio >= 3}
                                description="Risk/Ödül oranı uygun"
                            />
                        </div>
                    </div>

                    {/* RIGHT: Trade Management */}
                    <div style={styles.rightColumn}>
                        <div style={styles.sectionTitle}>💰 TRADE SETUP</div>

                        {/* Entry/SL/TP */}
                        <div style={styles.priceGrid}>
                            <div style={styles.priceItem}>
                                <span style={styles.priceLabel}>ENTRY</span>
                                <span style={styles.priceValue}>${setup.entryPrice.toFixed(4)}</span>
                            </div>
                            <div style={styles.priceItem}>
                                <span style={styles.priceLabel}>STOP</span>
                                <span style={{ ...styles.priceValue, color: '#ff4444' }}>
                                    ${setup.stopLoss.toFixed(4)}
                                </span>
                            </div>
                            <div style={styles.priceItem}>
                                <span style={styles.priceLabel}>TARGET</span>
                                <span style={{ ...styles.priceValue, color: '#00ff00' }}>
                                    ${setup.takeProfit.toFixed(4)}
                                </span>
                            </div>
                            <div style={styles.priceItem}>
                                <span style={styles.priceLabel}>R/R</span>
                                <span style={{ ...styles.priceValue, color: '#00ffff' }}>
                                    {setup.riskRewardRatio}:1
                                </span>
                            </div>
                        </div>

                        {/* Position Calculator */}
                        <div style={styles.calculatorBox}>
                            <div style={styles.calculatorTitle}>📐 POSITION SIZE</div>
                            <div style={styles.inputRow}>
                                <label style={styles.inputLabel}>Portfolio ($)</label>
                                <input
                                    type="number"
                                    value={portfolioSize}
                                    onChange={(e) => setPortfolioSize(parseFloat(e.target.value) || 0)}
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.resultRow}>
                                <div style={styles.resultItem}>
                                    <span style={styles.resultLabel}>SIZE</span>
                                    <span style={styles.resultValue}>
                                        {formatQuantity(position.positionSize, setup.symbol)}
                                    </span>
                                </div>
                                <div style={styles.resultItem}>
                                    <span style={styles.resultLabel}>LEVERAGE</span>
                                    <span style={{
                                        ...styles.resultValue,
                                        color: position.recommendedLeverage > 5 ? '#ffaa00' : '#00ff00'
                                    }}>
                                        {position.recommendedLeverage}x
                                    </span>
                                </div>
                            </div>
                            <div style={styles.riskNote}>
                                Risk: {formatCurrency(position.riskAmount)} (%{riskPercentage})
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Reasoning Footer */}
                <div style={styles.reasoningSection}>
                    <div style={styles.reasoningTitle}>🔍 AI REASONING</div>
                    <div style={styles.reasoningList}>
                        {setup.reasons.map((reason, index) => (
                            <span key={index} style={styles.reasonTag}>
                                {reason}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Action Button */}
                <button style={styles.executeBtn} onClick={handleExecute}>
                    ⚡ EXECUTE ON BINANCE FUTURES
                </button>

                {/* Disclaimer */}
                <div style={styles.disclaimer}>
                    ⚠️ NFA - Bu finansal tavsiye değildir. Sadece analiz aracıdır.
                </div>
            </div>
        </div>
    );
}

// CheckItem Component
function CheckItem({ label, checked, description }: { label: string; checked: boolean; description: string }) {
    return (
        <div style={styles.checkItem}>
            <div style={{
                ...styles.checkBox,
                backgroundColor: checked ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                borderColor: checked ? '#00ff00' : '#444',
            }}>
                {checked ? '✓' : '○'}
            </div>
            <div style={styles.checkContent}>
                <div style={{
                    ...styles.checkLabel,
                    color: checked ? '#fff' : '#666',
                }}>{label}</div>
                <div style={styles.checkDesc}>{description}</div>
            </div>
        </div>
    );
}

// Styles
const styles: { [key: string]: React.CSSProperties } = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        backdropFilter: 'blur(10px)',
    },
    card: {
        width: '900px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        overflowY: 'auto',
        backgroundColor: 'rgba(10, 15, 30, 0.98)',
        border: '1px solid rgba(0, 255, 255, 0.4)',
        borderRadius: '16px',
        fontFamily: "'Courier New', monospace",
        color: '#ffffff',
        boxShadow: '0 0 60px rgba(0, 255, 255, 0.2), inset 0 0 100px rgba(0, 0, 0, 0.5)',
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
        opacity: 0.2,
    },
    closeBtn: {
        position: 'absolute',
        top: '16px',
        right: '16px',
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid #444',
        borderRadius: '50%',
        width: '36px',
        height: '36px',
        color: '#888',
        fontSize: '18px',
        cursor: 'pointer',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        padding: '24px 30px',
        borderBottom: '1px solid rgba(0, 255, 255, 0.2)',
        backgroundColor: 'rgba(0, 255, 255, 0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
    },
    headerBadge: {
        backgroundColor: 'rgba(0, 255, 255, 0.1)',
        border: '1px solid #00ffff',
        borderRadius: '20px',
        padding: '6px 16px',
        color: '#00ffff',
        fontSize: '11px',
        fontWeight: 'bold',
        letterSpacing: '1px',
    },
    headerSymbol: {
        color: '#fff',
        fontSize: '28px',
        fontWeight: 'bold',
        letterSpacing: '2px',
        flex: 1,
    },
    confidenceBadge: {
        backgroundColor: 'rgba(0, 255, 0, 0.1)',
        border: '1px solid #00ff00',
        borderRadius: '6px',
        padding: '8px 16px',
        color: '#00ff00',
        fontSize: '14px',
        fontWeight: 'bold',
    },
    content: {
        display: 'flex',
        gap: '1px',
        backgroundColor: 'rgba(0, 255, 255, 0.1)',
    },
    leftColumn: {
        width: '180px',
        backgroundColor: 'rgba(10, 15, 30, 0.98)',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerColumn: {
        flex: 1,
        backgroundColor: 'rgba(10, 15, 30, 0.98)',
        padding: '24px',
    },
    rightColumn: {
        width: '280px',
        backgroundColor: 'rgba(10, 15, 30, 0.98)',
        padding: '24px',
    },
    directionBox: {
        textAlign: 'center',
    },
    directionArrow: {
        fontSize: '72px',
        fontWeight: 'bold',
        lineHeight: 1,
        textShadow: '0 0 30px currentColor',
    },
    directionText: {
        fontSize: '24px',
        fontWeight: 'bold',
        letterSpacing: '4px',
        marginTop: '10px',
    },
    directionLabel: {
        color: '#666',
        fontSize: '11px',
        marginTop: '8px',
        letterSpacing: '2px',
    },
    sectionTitle: {
        color: '#888',
        fontSize: '11px',
        letterSpacing: '2px',
        marginBottom: '16px',
        paddingBottom: '8px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
    },
    checkList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    checkItem: {
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
    },
    checkBox: {
        width: '24px',
        height: '24px',
        borderRadius: '6px',
        border: '1px solid',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        flexShrink: 0,
        color: '#00ff00',
    },
    checkContent: {
        flex: 1,
    },
    checkLabel: {
        fontSize: '13px',
        fontWeight: 'bold',
        marginBottom: '2px',
    },
    checkDesc: {
        color: '#555',
        fontSize: '10px',
    },
    priceGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        marginBottom: '16px',
    },
    priceItem: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: '10px',
        borderRadius: '6px',
        borderLeft: '2px solid rgba(0, 255, 255, 0.3)',
    },
    priceLabel: {
        display: 'block',
        color: '#666',
        fontSize: '9px',
        letterSpacing: '1px',
        marginBottom: '4px',
    },
    priceValue: {
        display: 'block',
        color: '#fff',
        fontSize: '13px',
        fontWeight: 'bold',
    },
    calculatorBox: {
        backgroundColor: 'rgba(0, 255, 255, 0.03)',
        border: '1px solid rgba(0, 255, 255, 0.2)',
        borderRadius: '8px',
        padding: '12px',
    },
    calculatorTitle: {
        color: '#00ffff',
        fontSize: '10px',
        letterSpacing: '1px',
        marginBottom: '10px',
    },
    inputRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '10px',
    },
    inputLabel: {
        color: '#666',
        fontSize: '10px',
        width: '80px',
    },
    input: {
        flex: 1,
        padding: '8px',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        borderRadius: '4px',
        color: '#fff',
        fontSize: '12px',
        fontFamily: "'Courier New', monospace",
        outline: 'none',
    },
    resultRow: {
        display: 'flex',
        gap: '10px',
    },
    resultItem: {
        flex: 1,
        textAlign: 'center',
    },
    resultLabel: {
        display: 'block',
        color: '#666',
        fontSize: '8px',
        letterSpacing: '0.5px',
    },
    resultValue: {
        display: 'block',
        color: '#fff',
        fontSize: '14px',
        fontWeight: 'bold',
    },
    riskNote: {
        color: '#ffaa00',
        fontSize: '10px',
        textAlign: 'center',
        marginTop: '10px',
        padding: '6px',
        backgroundColor: 'rgba(255, 170, 0, 0.1)',
        borderRadius: '4px',
    },
    reasoningSection: {
        padding: '16px 30px',
        borderTop: '1px solid rgba(0, 255, 255, 0.1)',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
    reasoningTitle: {
        color: '#666',
        fontSize: '10px',
        letterSpacing: '1px',
        marginBottom: '10px',
    },
    reasoningList: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
    },
    reasonTag: {
        backgroundColor: 'rgba(0, 255, 255, 0.1)',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        borderRadius: '4px',
        padding: '6px 12px',
        color: '#aaa',
        fontSize: '10px',
    },
    executeBtn: {
        width: 'calc(100% - 60px)',
        margin: '20px 30px',
        padding: '18px',
        background: 'linear-gradient(135deg, #00aa00 0%, #006600 100%)',
        border: '1px solid #00ff00',
        borderRadius: '10px',
        color: '#fff',
        fontSize: '16px',
        fontWeight: 'bold',
        letterSpacing: '2px',
        cursor: 'pointer',
        boxShadow: '0 0 30px rgba(0, 255, 0, 0.3)',
        transition: 'all 0.2s',
    },
    disclaimer: {
        padding: '12px 30px',
        backgroundColor: 'rgba(255, 170, 0, 0.05)',
        borderTop: '1px solid rgba(255, 170, 0, 0.2)',
        color: '#666',
        fontSize: '10px',
        textAlign: 'center',
    },
};

export default SignalCard;
