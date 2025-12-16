/**
 * Delta Hunter - Post-processing Effects
 * Bloom efekti ile neon glow.
 * KURAL: Performans için optimize edilmiş ayarlar.
 */

import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { KernelSize } from 'postprocessing';

export function Effects() {
    return (
        <EffectComposer>
            <Bloom
                luminanceThreshold={0.4}
                luminanceSmoothing={0.9}
                intensity={1.5}
                mipmapBlur={true}
                kernelSize={KernelSize.SMALL}
                resolutionScale={0.5}
            />
        </EffectComposer>
    );
}

export default Effects;
