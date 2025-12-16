/**
 * Delta Hunter - Energy Pillar Aura
 * CVD Divergence için silindirik enerji kalkanı.
 * MeshDistortMaterial ile dalgalanan holografik efekt.
 * Score > 50: Bullish (Cyan)
 * Score < -50: Bearish (Neon Red)
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';
import { Mesh, AdditiveBlending } from 'three';

interface AuraProps {
    score: number; // -100 to +100
    barHeight: number;
}

// Enerji Sütunu sabit yüksekliği
const PILLAR_HEIGHT = 6;
const PILLAR_RADIUS = 0.8;

export function Aura({ score, barHeight }: AuraProps) {
    const meshRef = useRef<Mesh>(null);
    const absScore = Math.abs(score);

    // Visibility belirleme
    const shouldShow = absScore >= 50;

    // Renk belirleme
    const isBearish = score < 0;
    const color = isBearish ? '#ff0000' : '#00ffff';

    // Opaklık - score'a göre
    const opacity = 0.25 + (absScore / 100) * 0.15;

    // Animasyon - HOOK'LAR HER ZAMAN ÇAĞRILMALI
    useFrame((state) => {
        if (!meshRef.current || !shouldShow) return;

        const time = state.clock.elapsedTime;

        // Yavaş rotasyon
        meshRef.current.rotation.y = time * 0.3;

        // Hafif scale pulse
        const pulse = Math.sin(time * (isBearish ? 3 : 1.5)) * 0.03 + 1;
        meshRef.current.scale.x = pulse;
        meshRef.current.scale.z = pulse;
    });

    // Score düşükse aura gösterme
    if (!shouldShow) return null;

    // Silindirin Y pozisyonu - çubuğu içine alacak şekilde
    const pillarY = PILLAR_HEIGHT / 2 + 0.2;

    return (
        <mesh
            ref={meshRef}
            position={[0, pillarY, 0]}
        >
            <cylinderGeometry args={[PILLAR_RADIUS, PILLAR_RADIUS, PILLAR_HEIGHT, 32, 1, true]} />
            <MeshDistortMaterial
                color={color}
                transparent={true}
                opacity={opacity}
                roughness={0}
                metalness={0.8}
                blending={AdditiveBlending}
                distort={0.4}
                speed={isBearish ? 4 : 2}
                depthWrite={false}
                side={2} // DoubleSide
            />
        </mesh>
    );
}

export default Aura;
