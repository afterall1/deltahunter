/**
 * Delta Hunter - App Component
 * Cyberpunk Trading Terminal UI.
 */

import { Scene } from './visuals/Scene';
import { useHeartbeat } from './logic/useHeartbeat';
import { useCryptoStore, FilterType } from './logic/store';
import { LOOKBACK_OPTIONS } from '../shared/constants';

export function App() {
    // Heartbeat hook'unu başlat
    useHeartbeat();

    // Store state
    const { isLoading, error, lastUpdate, coins, config, filter, updateConfig, setFilter } = useCryptoStore();

    // Lookback değiştiğinde
    const handleLookbackChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateConfig({ lookbackPeriod: Number(e.target.value) });
    };

    // Filtrelenmiş coin sayısı
    const visibleCount = filter === 'ALL'
        ? coins.length
        : filter === 'GAINERS'
            ? coins.filter(c => c.percentChange > 0).length
            : coins.filter(c => c.percentChange < 0).length;

    return (
        <div style={styles.container}>
            {/* Global Styles */}
            <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
      `}</style>

            {/* 3D Sahne */}
            <Scene />

            {/* Loading Overlay */}
            {coins.length === 0 && !error && (
                <div style={styles.loading}>
                    <div style={styles.loadingText}>
                        <span style={{ color: '#00ffcc' }}>{'>'}</span> INITIALIZING DELTA HUNTER
                        <span style={styles.cursor}>_</span>
                    </div>
                    <div style={styles.loadingSubtext}>
                        Fetching market data from Binance...
                    </div>
                </div>
            )}

            {/* Control Panel */}
            <div style={styles.panel}>
                {/* Scanline effect */}
                <div style={styles.scanline} />

                {/* Header */}
                <div style={styles.header}>
                    <span style={styles.headerIcon}>◆</span>
                    <span style={styles.headerText}>DELTA HUNTER</span>
                    <span style={styles.version}>v1.0</span>
                    <span style={styles.cursor}>_</span>
                </div>

                {/* Divider */}
                <div style={styles.divider} />

                {/* Stats */}
                <div style={styles.statsGrid}>
                    <div style={styles.statItem}>
                        <span style={styles.statLabel}>VISIBLE</span>
                        <span style={styles.statValue}>{visibleCount}</span>
                    </div>
                    <div style={styles.statItem}>
                        <span style={styles.statLabel}>TOTAL</span>
                        <span style={styles.statValueDim}>{coins.length}</span>
                    </div>
                </div>

                {/* Lookback Selector */}
                <div style={styles.controlRow}>
                    <span style={styles.controlLabel}>⏱ LOOKBACK</span>
                    <select
                        style={styles.select}
                        value={config.lookbackPeriod}
                        onChange={handleLookbackChange}
                    >
                        {LOOKBACK_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt < 60 ? `${opt} MIN` : `${opt / 60} HOUR`}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Last Update */}
                <div style={styles.controlRow}>
                    <span style={styles.controlLabel}>⟳ UPDATED</span>
                    <span style={styles.timestamp}>
                        {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : '---'}
                    </span>
                </div>

                {/* Divider */}
                <div style={styles.divider} />

                {/* Filter Section */}
                <div style={styles.filterSection}>
                    <span style={styles.filterLabel}>◈ FILTER</span>
                    <div style={styles.filterButtons}>
                        <FilterButton
                            type="ALL"
                            active={filter === 'ALL'}
                            onClick={() => setFilter('ALL')}
                            label="ALL"
                        />
                        <FilterButton
                            type="GAINERS"
                            active={filter === 'GAINERS'}
                            onClick={() => setFilter('GAINERS')}
                            label="▲ UP"
                        />
                        <FilterButton
                            type="LOSERS"
                            active={filter === 'LOSERS'}
                            onClick={() => setFilter('LOSERS')}
                            label="▼ DOWN"
                        />
                    </div>
                </div>

                {/* Status */}
                {isLoading && (
                    <div style={styles.status}>
                        <span style={styles.statusDot}>●</span> UPDATING...
                    </div>
                )}

                {error && (
                    <div style={styles.error}>
                        <span style={styles.errorIcon}>⚠</span> {error}
                    </div>
                )}

                {/* Footer */}
                <div style={styles.footer}>
                    <span style={styles.footerText}>CLICK BAR TO TRADE ON BINANCE</span>
                </div>
            </div>
        </div>
    );
}

// Filter Button Component
function FilterButton({ type, active, onClick, label }: {
    type: FilterType;
    active: boolean;
    onClick: () => void;
    label: string;
}) {
    const colors = {
        ALL: { active: '#ffffff', inactive: '#444' },
        GAINERS: { active: '#00ff00', inactive: '#004400' },
        LOSERS: { active: '#ff0000', inactive: '#440000' },
    };

    const color = colors[type];

    return (
        <button
            onClick={onClick}
            style={{
                flex: 1,
                padding: '8px 4px',
                fontSize: '11px',
                fontWeight: 'bold',
                fontFamily: "'Courier New', monospace",
                border: `1px solid ${active ? color.active : '#333'}`,
                borderRadius: '3px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: active ? color.inactive : 'transparent',
                color: active ? color.active : '#666',
                boxShadow: active ? `0 0 10px ${color.active}40` : 'none',
                textShadow: active ? `0 0 5px ${color.active}` : 'none',
            }}
        >
            {label}
        </button>
    );
}

// Styles
const styles: { [key: string]: React.CSSProperties } = {
    container: {
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000000',
        overflow: 'hidden',
        position: 'relative',
    },
    panel: {
        position: 'absolute',
        top: '20px',
        left: '20px',
        width: '240px',
        fontFamily: "'Courier New', monospace",
        fontSize: '12px',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        padding: '0',
        borderRadius: '4px',
        border: '1px solid #00ffcc',
        boxShadow: '0 0 20px rgba(0, 255, 204, 0.15), inset 0 0 30px rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        overflow: 'hidden',
    },
    scanline: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: 'linear-gradient(transparent, rgba(0, 255, 204, 0.1), transparent)',
        animation: 'scanline 3s linear infinite',
        pointerEvents: 'none',
    },
    header: {
        padding: '12px 15px',
        backgroundColor: 'rgba(0, 255, 204, 0.1)',
        borderBottom: '1px solid rgba(0, 255, 204, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    headerIcon: {
        color: '#00ffcc',
        fontSize: '14px',
    },
    headerText: {
        color: '#00ffcc',
        fontWeight: 'bold',
        fontSize: '14px',
        letterSpacing: '1px',
        textShadow: '0 0 10px rgba(0, 255, 204, 0.5)',
    },
    version: {
        color: '#666',
        fontSize: '10px',
        marginLeft: 'auto',
    },
    cursor: {
        animation: 'blink 1s step-end infinite',
        color: '#00ffcc',
    },
    divider: {
        height: '1px',
        backgroundColor: 'rgba(0, 255, 204, 0.2)',
        margin: '0 15px',
    },
    statsGrid: {
        display: 'flex',
        padding: '12px 15px',
        gap: '15px',
    },
    statItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    statLabel: {
        color: '#666',
        fontSize: '9px',
        letterSpacing: '1px',
    },
    statValue: {
        color: '#00ff00',
        fontSize: '20px',
        fontWeight: 'bold',
        textShadow: '0 0 10px rgba(0, 255, 0, 0.5)',
    },
    statValueDim: {
        color: '#888',
        fontSize: '20px',
        fontWeight: 'bold',
    },
    controlRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 15px',
    },
    controlLabel: {
        color: '#888',
        fontSize: '11px',
    },
    select: {
        backgroundColor: 'rgba(0, 20, 20, 0.9)',
        color: '#00ffcc',
        border: '1px solid #00ffcc50',
        borderRadius: '3px',
        padding: '4px 8px',
        fontSize: '11px',
        fontFamily: "'Courier New', monospace",
        cursor: 'pointer',
        outline: 'none',
    },
    timestamp: {
        color: '#666',
        fontSize: '11px',
    },
    filterSection: {
        padding: '12px 15px',
    },
    filterLabel: {
        color: '#888',
        fontSize: '10px',
        letterSpacing: '1px',
        marginBottom: '8px',
        display: 'block',
    },
    filterButtons: {
        display: 'flex',
        gap: '6px',
    },
    status: {
        padding: '8px 15px',
        color: '#ffcc00',
        fontSize: '11px',
        animation: 'pulse 1s ease-in-out infinite',
    },
    statusDot: {
        marginRight: '5px',
    },
    error: {
        padding: '8px 15px',
        color: '#ff4444',
        fontSize: '11px',
    },
    errorIcon: {
        marginRight: '5px',
    },
    footer: {
        padding: '10px 15px',
        borderTop: '1px solid rgba(0, 255, 204, 0.1)',
        backgroundColor: 'rgba(0, 255, 204, 0.03)',
    },
    footerText: {
        color: '#444',
        fontSize: '9px',
        letterSpacing: '0.5px',
    },
    loading: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        fontFamily: "'Courier New', monospace",
    },
    loadingText: {
        color: '#00ffcc',
        fontSize: '18px',
        marginBottom: '10px',
        textShadow: '0 0 20px rgba(0, 255, 204, 0.8)',
    },
    loadingSubtext: {
        color: '#666',
        fontSize: '12px',
    },
};

export default App;
