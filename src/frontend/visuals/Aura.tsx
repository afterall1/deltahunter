/**
 * Delta Hunter - Aura Component
 * CVD Divergence için yanıp sönen enerji aurası.
 * Score > 50: Bullish (Cyan glow)
 * Score < -50: Bearish/Trap (Red/Orange glow)
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';

interface AuraProps {
    score: number; // -100 to +100
    barHeight: number;
}

export function Aura({ score, barHeight }: AuraProps) {
    const meshRef = useRef<Mesh>(null);
    const absScore = Math.abs(score);

    // Renk ve visibility belirleme
    const shouldShow = absScore >= 50;
    const isBearish = score < 0;
    const color = isBearish ? '#ff4500' : '#00ffff';
    const baseOpacity = 0.15 + (absScore / 100) * 0.2;

    // Animasyon - HOOK'LAR HER ZAMAN ÇAĞRILMALI (koşulsuz)
    useFrame((state) => {
        if (!meshRef.current || !shouldShow) return;

        const time = state.clock.elapsedTime;

        // Bearish için hızlı titreşim, Bullish için yavaş nefes
        const speed = isBearish ? 4 : 2;
        const pulse = Math.sin(time * speed) * 0.5 + 0.5;

        // Scale animasyonu (1.0 - 1.2 arası)
        const scale = 1.0 + pulse * 0.2;
        meshRef.current.scale.setScalar(scale);

        // Opacity animasyonu
        const material = meshRef.current.material as any;
        if (material) {
            material.opacity = baseOpacity + pulse * 0.15;
        }
    });

    // Score düşükse aura gösterme - HOOK'LARDAN SONRA RETURN
    if (!shouldShow) return null;

    // Aura boyutu - bar'ı kaplayacak şekilde
    const auraSize = Math.max(1.5, barHeight * 0.5 + 1);

    return (
        <mesh
            ref={meshRef}
            position={[0, barHeight / 2, 0]}
        >
            <sphereGeometry args={[auraSize, 16, 16]} />
            <meshBasicMaterial
                color={color}
                transparent={true}
                opacity={baseOpacity}
                depthWrite={false}
            />
        </mesh>
    );
}

export default Aura;
