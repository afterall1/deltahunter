/**
 * Delta Hunter - Post-processing Effects
 * Bloom efekti ile neon glow.
 * KURAL: Performans için düşük intensity kullan.
 */

import { EffectComposer, Bloom } from '@react-three/postprocessing';

export function Effects() {
    return (
        <EffectComposer>
            <Bloom
                luminanceThreshold={0.4}
                luminanceSmoothing={0.9}
                intensity={1.5}
                mipmapBlur={true}
            />
        </EffectComposer>
    );
}

export default Effects;
