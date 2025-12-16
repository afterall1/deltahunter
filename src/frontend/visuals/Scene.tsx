/**
 * Delta Hunter - Scene Component
 * Canvas, ışıklar, kontroller, efektler ve yansıtıcı zemin.
 * Ortalanmış 10-sütun Grid Layout + Filtreleme.
 * KURAL: Burada veri çekme kodu YOK - sadece görsel.
 */

import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, MeshReflectorMaterial } from '@react-three/drei';
import { CoinBar } from './CoinBar';
import { Effects } from './Effects';
import { useCryptoStore } from '../logic/store';

// Grid Layout sabitleri
const GRID_COLUMNS = 10;
const BAR_SPACING_X = 2.0;
const BAR_SPACING_Z = 2.2;

function ReflectorFloor() {
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
            <planeGeometry args={[80, 80]} />
            <MeshReflectorMaterial
                blur={[300, 100]}
                resolution={1024}
                mixBlur={1}
                mixStrength={35}
                roughness={1}
                depthScale={1.2}
                minDepthThreshold={0.4}
                maxDepthThreshold={1.4}
                color="#030303"
                metalness={0.6}
                mirror={0.3}
            />
        </mesh>
    );
}

function SceneContent() {
    // Store'dan coin ve filter state'lerini çek
    const coins = useCryptoStore((state) => state.coins);
    const filter = useCryptoStore((state) => state.filter);

    // Filtrelenmiş coinler
    const filteredCoins = useMemo(() => {
        if (filter === 'GAINERS') {
            return coins.filter(c => c.percentChange > 0);
        } else if (filter === 'LOSERS') {
            return coins.filter(c => c.percentChange < 0);
        }
        return coins;
    }, [coins, filter]);

    // Grid merkezleme hesapları
    const { offsetX, offsetZ } = useMemo(() => {
        const cols = Math.min(filteredCoins.length, GRID_COLUMNS);
        const rows = Math.ceil(filteredCoins.length / GRID_COLUMNS);

        // Grid genişliği ve derinliği
        const gridWidth = (cols - 1) * BAR_SPACING_X;
        const gridDepth = (rows - 1) * BAR_SPACING_Z;

        return {
            offsetX: -gridWidth / 2,
            offsetZ: -gridDepth / 2,
        };
    }, [filteredCoins.length]);

    return (
        <>
            {/* Işıklar */}
            <ambientLight intensity={0.1} />
            <pointLight position={[20, 25, 20]} intensity={1.2} color="#ffffff" />
            <pointLight position={[-20, 20, -20]} intensity={0.6} color="#4080ff" />
            <spotLight
                position={[0, 35, 0]}
                angle={0.8}
                penumbra={1}
                intensity={0.8}
                color="#ffffff"
            />

            {/* Arka Plan - Uzay Yıldızları */}
            <Stars
                radius={100}
                depth={50}
                count={3000}
                factor={4}
                saturation={0}
                fade
                speed={0.5}
            />

            {/* Yansıtıcı Cam Zemin */}
            <ReflectorFloor />

            {/* Ortalanmış Coin Bar Grid */}
            <group position={[0, 0, 0]}>
                {filteredCoins.map((coin, index) => {
                    const col = index % GRID_COLUMNS;
                    const row = Math.floor(index / GRID_COLUMNS);

                    const x = offsetX + col * BAR_SPACING_X;
                    const z = offsetZ + row * BAR_SPACING_Z;

                    return (
                        <CoinBar
                            key={coin.symbol}
                            symbol={coin.symbol}
                            percentChange={coin.percentChange}
                            cvdDivergenceScore={coin.cvdDivergenceScore}
                            position={[x, 0, z]}
                        />
                    );
                })}
            </group>

            {/* Kamera Kontrolleri */}
            <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                minDistance={8}
                maxDistance={100}
                target={[0, 2, 0]}
                maxPolarAngle={Math.PI / 2 - 0.05}
            />

            {/* Post-processing Effects */}
            <Effects />
        </>
    );
}

export function Scene() {
    return (
        <Canvas
            camera={{
                position: [0, 20, 35],
                fov: 55,
                near: 0.1,
                far: 1000,
            }}
            gl={{ antialias: true, alpha: false }}
            style={{ background: '#000000' }}
        >
            <color attach="background" args={['#000000']} />
            <fog attach="fog" args={['#000000', 50, 150]} />
            <SceneContent />
        </Canvas>
    );
}

export default Scene;
