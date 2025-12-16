/**
 * Delta Hunter - CoinBar Component
 * Tek bir 3D çubuk bileşeni.
 * Dinamik renk yoğunluğu + Click-to-trade + Hover tooltip.
 * KURAL: Burada veri çekme kodu YOK - sadece görsel.
 */

import { useState, useMemo } from 'react';
import { Text, Billboard } from '@react-three/drei';
import { SentimentTooltip } from './SentimentTooltip';
import { Aura } from './Aura';

interface CoinBarProps {
    symbol: string;
    percentChange: number;
    cvdDivergenceScore?: number; // -100 to +100
    position: [number, number, number];
}

// Bar boyut sabitleri
const BAR_WIDTH = 0.9;
const BAR_DEPTH = 0.9;
const MIN_HEIGHT = 0.2;
const HEIGHT_MULTIPLIER = 0.8;

/**
 * Renk ve parlaklık hesapla
 * %0-1: Sönük, %1-5: Normal, %5+: Çok parlak
 */
function getColorGrading(percentChange: number, isPositive: boolean) {
    const absChange = Math.abs(percentChange);

    // Bazal renkler
    const baseGreen = { r: 0, g: 1, b: 0 };
    const baseRed = { r: 1, g: 0, b: 0 };
    const baseColor = isPositive ? baseGreen : baseRed;

    let intensity: number;
    let colorMix: { r: number; g: number; b: number };

    if (absChange < 1) {
        // Sönük: %0-1
        intensity = 0.3 + (absChange * 0.3);
        colorMix = baseColor;
    } else if (absChange < 5) {
        // Normal: %1-5
        intensity = 0.6 + ((absChange - 1) / 4) * 1.2;
        colorMix = baseColor;
    } else {
        // Çok parlak: %5+
        // Beyaza çalan renk (daha açık ton)
        const whiteMix = Math.min((absChange - 5) / 10, 0.5);
        colorMix = {
            r: baseColor.r + (1 - baseColor.r) * whiteMix,
            g: baseColor.g + (1 - baseColor.g) * whiteMix,
            b: baseColor.b + (1 - baseColor.b) * whiteMix,
        };
        intensity = 1.8 + Math.min((absChange - 5) / 5, 1.5);
    }

    // RGB to hex
    const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
    const hexColor = `#${toHex(colorMix.r)}${toHex(colorMix.g)}${toHex(colorMix.b)}`;

    return { color: hexColor, intensity };
}

export function CoinBar({ symbol, percentChange, cvdDivergenceScore, position }: CoinBarProps) {
    const [hovered, setHovered] = useState(false);

    // Yükseklik hesapla
    const height = MIN_HEIGHT + Math.abs(percentChange) * HEIGHT_MULTIPLIER;

    // Dinamik renk ve parlaklık
    const isPositive = percentChange >= 0;
    const { color, intensity } = useMemo(
        () => getColorGrading(percentChange, isPositive),
        [percentChange, isPositive]
    );

    // Hover'da ekstra parlaklık
    const finalIntensity = hovered ? intensity * 1.5 : intensity;

    // Coin sembolü (USDT'yi kaldır)
    const displaySymbol = symbol.replace('USDT', '');

    // Yüzde formatı
    const percentText = `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%`;

    // Binance trade URL
    const tradeUrl = `https://www.binance.com/en/trade/${symbol.replace('USDT', '')}_USDT`;

    // Click handler - Binance'a git
    const handleClick = () => {
        window.open(tradeUrl, '_blank');
    };

    // Hover handlers - Cursor değiştir
    const handlePointerOver = () => {
        setHovered(true);
        document.body.style.cursor = 'pointer';
    };

    const handlePointerOut = () => {
        setHovered(false);
        document.body.style.cursor = 'auto';
    };

    return (
        <group position={position}>
            {/* 3D Bar */}
            <mesh
                position={[0, height / 2, 0]}
                onClick={handleClick}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
            >
                <boxGeometry args={[BAR_WIDTH, height, BAR_DEPTH]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={finalIntensity}
                    metalness={0.2}
                    roughness={0.3}
                    toneMapped={false}
                />
            </mesh>

            {/* Billboard - Her zaman kameraya bakar */}
            <Billboard position={[0, height + 0.6, 0]}>
                {/* Coin Sembolü */}
                <Text
                    fontSize={0.35}
                    color="white"
                    anchorX="center"
                    anchorY="bottom"
                    outlineWidth={0.015}
                    outlineColor="black"
                >
                    {displaySymbol}
                </Text>
            </Billboard>

            {/* Yüzde Değişimi */}
            <Billboard position={[0, height + 0.25, 0]}>
                <Text
                    fontSize={0.22}
                    color={color}
                    anchorX="center"
                    anchorY="bottom"
                    outlineWidth={0.01}
                    outlineColor="black"
                >
                    {percentText}
                </Text>
            </Billboard>

            {/* Hover glow indicator */}
            {hovered && (
                <pointLight
                    position={[0, height / 2, 1.5]}
                    color={color}
                    intensity={3}
                    distance={5}
                />
            )}

            {/* Sentiment Tooltip - Hover'da görünür */}
            <group position={[0, height + 3.5, 0]}>
                <SentimentTooltip
                    symbol={symbol}
                    visible={hovered}
                    cvdScore={cvdDivergenceScore}
                />
            </group>

            {/* CVD Divergence Aura - Score yüksekse yanıp söner */}
            <Aura score={cvdDivergenceScore || 0} barHeight={height} />
        </group>
    );
}

export default CoinBar;
