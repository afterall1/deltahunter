/**
 * Delta Hunter - AI Marker Component
 * AI sinyali olan coinlerin tepesinde dönen altın elmas.
 * Floating + Rotation animasyonu ile dikkat çeker.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';

interface AiMarkerProps {
    position?: [number, number, number];
}

export function AiMarker({ position = [0, 0, 0] }: AiMarkerProps) {
    const meshRef = useRef<Mesh>(null);

    // Animasyon - döndürme ve süzülme
    useFrame((state) => {
        if (!meshRef.current) return;

        const time = state.clock.elapsedTime;

        // Kendi ekseni etrafında döndür
        meshRef.current.rotation.y = time * 0.8;
        meshRef.current.rotation.x = Math.sin(time * 0.5) * 0.2;

        // Yukarı-aşağı süzülme (floating)
        meshRef.current.position.y = position[1] + Math.sin(time * 2) * 0.15;
    });

    return (
        <mesh ref={meshRef} position={position}>
            {/* Octahedron - Elmas şekli */}
            <octahedronGeometry args={[0.4, 0]} />
            <meshStandardMaterial
                color="#FFD700"
                emissive="#FFD700"
                emissiveIntensity={2}
                metalness={0.8}
                roughness={0.2}
                toneMapped={false}
            />
        </mesh>
    );
}

export default AiMarker;
