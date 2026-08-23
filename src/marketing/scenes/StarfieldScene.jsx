import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { motionState } from "../animations/motionState";

/* ────────────────────────────────────────────────────────────
   Shared GLSL — value noise + fbm, used by the nebula wash.
   ──────────────────────────────────────────────────────────── */
const NOISE_GLSL = /* glsl */ `
  vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(dot(hash22(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
          dot(hash22(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
      mix(dot(hash22(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
          dot(hash22(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
      u.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p = rot * p * 2.02;
      amplitude *= 0.5;
    }
    return value;
  }
`;

/* ────────────────────────────────────────────────────────────
   NEBULA
   A single oversized plane parked behind everything. Two fbm
   lookups warp each other to get the wispy, non-repeating cloud
   structure; the palette walks navy → nebula purple → magenta
   with a cyan rim where density is thinnest.
   ──────────────────────────────────────────────────────────── */
function Nebula() {
    const material = useRef();

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uProgress: { value: 0 },
            uNavy: { value: new THREE.Color("#0D1128") },
            uNebula: { value: new THREE.Color("#5B3AA0") },
            uMagenta: { value: new THREE.Color("#C23FDB") },
            uIon: { value: new THREE.Color("#4CE0FF") },
        }),
        []
    );

    useFrame((_, delta) => {
        if (!material.current) return;
        const d = Math.min(delta, 0.05);
        material.current.uniforms.uTime.value += d * 0.055;
        // Ease the wash toward the page's scroll position so the colour
        // shifts as the visitor descends, rather than snapping.
        const u = material.current.uniforms.uProgress;
        u.value += (motionState.progress - u.value) * 0.05;
    });

    return (
        <mesh position={[0, 0, -55]} renderOrder={-1}>
            <planeGeometry args={[240, 140, 1, 1]} />
            <shaderMaterial
                ref={material}
                uniforms={uniforms}
                depthWrite={false}
                transparent
                vertexShader={/* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
                fragmentShader={/* glsl */ `
          varying vec2 vUv;
          uniform float uTime;
          uniform float uProgress;
          uniform vec3 uNavy;
          uniform vec3 uNebula;
          uniform vec3 uMagenta;
          uniform vec3 uIon;

          ${NOISE_GLSL}

          void main() {
            vec2 uv = vUv;
            vec2 p = (uv - 0.5) * vec2(3.4, 2.0);

            // Domain warp: the second fbm displaces the first, which is what
            // stops the cloud reading as tiled noise.
            vec2 warp = vec2(
              fbm(p * 1.3 + vec2(uTime * 0.6, uTime * 0.35)),
              fbm(p * 1.3 + vec2(4.7 - uTime * 0.4, 1.9 + uTime * 0.5))
            );
            float density = fbm(p * 1.15 + warp * 1.5 + vec2(0.0, uTime * 0.2));
            density = smoothstep(-0.15, 0.55, density);

            // Drifts the brightest band down the plane as the page scrolls.
            float band = smoothstep(0.95, 0.1, abs(uv.y - (0.72 - uProgress * 0.45)));

            vec3 col = mix(uNavy, uNebula, density);
            col = mix(col, uMagenta, pow(density, 2.6) * 0.85);
            col = mix(col, uIon, pow(1.0 - density, 6.0) * 0.16);

            // Vignette so the wash never fights the copy sitting on top of it.
            float vignette = smoothstep(1.15, 0.28, length((uv - 0.5) * vec2(1.5, 1.0)));
            float alpha = density * band * vignette * 0.78;

            gl_FragColor = vec4(col, alpha);
          }
        `}
            />
        </mesh>
    );
}

/* ────────────────────────────────────────────────────────────
   STARFIELD
   One buffer, wrapped in the vertex shader. `uTravel` slides every
   star toward the camera and mod() recycles it out the back, so the
   fly-through is genuinely endless for the cost of a single draw call.
   ──────────────────────────────────────────────────────────── */
const DEPTH = 260;

function Starfield({ count, spread, sizeRange, color, speed, opacity }) {
    const material = useRef();

    const geometry = useMemo(() => {
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const seeds = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            // Hollow out the very centre so stars never punch through the copy.
            const radius = spread * (0.25 + Math.random() * 0.75);
            const angle = Math.random() * Math.PI * 2;
            positions[i * 3] = Math.cos(angle) * radius * (0.7 + Math.random() * 0.6);
            positions[i * 3 + 1] = Math.sin(angle) * radius * 0.62;
            positions[i * 3 + 2] = (Math.random() - 0.5) * DEPTH;
            sizes[i] = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
            seeds[i] = Math.random();
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
        geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
        return geo;
    }, [count, spread, sizeRange]);

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uTravel: { value: 0 },
            uDepth: { value: DEPTH },
            uPixelRatio: { value: 1 },
            uColor: { value: new THREE.Color(color) },
            uOpacity: { value: opacity },
        }),
        [color, opacity]
    );

    const { gl } = useThree();
    uniforms.uPixelRatio.value = Math.min(gl.getPixelRatio(), 2);

    useFrame((_, delta) => {
        if (!material.current) return;
        const d = Math.min(delta, 0.05);
        const u = material.current.uniforms;
        u.uTime.value += d;
        // Ambient drift + scroll thrust + a kick proportional to fling velocity.
        const thrust = 1 + Math.min(Math.abs(motionState.velocity) * 0.35, 14);
        u.uTravel.value += d * speed * thrust + motionState.warp * speed * 0.9;
    });

    return (
        <points geometry={geometry} frustumCulled={false}>
            <shaderMaterial
                ref={material}
                uniforms={uniforms}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                vertexShader={/* glsl */ `
          attribute float aSize;
          attribute float aSeed;
          uniform float uTime;
          uniform float uTravel;
          uniform float uDepth;
          uniform float uPixelRatio;
          varying float vTwinkle;
          varying float vFade;

          void main() {
            vec3 pos = position;
            // Recycle depth so the field never runs out.
            pos.z = mod(pos.z + uTravel + uDepth * 0.5, uDepth) - uDepth * 0.5;

            vec4 mv = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mv;

            vTwinkle = 0.55 + 0.45 * sin(uTime * 1.6 + aSeed * 6.2831);
            // Fade in from the far plane and out as a star passes the camera,
            // otherwise stars pop in and streak past at the near clip.
            float dist = -mv.z;
            vFade = smoothstep(0.0, 26.0, dist) * smoothstep(uDepth * 0.62, uDepth * 0.28, dist);

            gl_PointSize = aSize * uPixelRatio * (170.0 / max(dist, 1.0));
          }
        `}
                fragmentShader={/* glsl */ `
          uniform vec3 uColor;
          uniform float uOpacity;
          varying float vTwinkle;
          varying float vFade;

          void main() {
            vec2 c = gl_PointCoord - 0.5;
            float d = length(c);
            if (d > 0.5) discard;
            float core = pow(smoothstep(0.5, 0.0, d), 2.4);
            gl_FragColor = vec4(uColor, core * vTwinkle * vFade * uOpacity);
          }
        `}
            />
        </points>
    );
}

/* ────────────────────────────────────────────────────────────
   PLANET LIMB
   A dark sphere lit only along one edge — reads as a world just
   off frame and gives the scene a horizon to orient against.
   ──────────────────────────────────────────────────────────── */
function PlanetLimb() {
    const mesh = useRef();

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uRim: { value: new THREE.Color("#8B5CF6") },
            uHot: { value: new THREE.Color("#4CE0FF") },
        }),
        []
    );

    useFrame((_, delta) => {
        if (!mesh.current) return;
        const d = Math.min(delta, 0.05);
        mesh.current.material.uniforms.uTime.value += d;
        mesh.current.rotation.y += d * 0.012;
        // Parallax: the planet lags the scroll, sitting "further away".
        mesh.current.position.y = -16 + motionState.progress * 9;
    });

    return (
        <mesh ref={mesh} position={[26, -16, -38]}>
            <sphereGeometry args={[17, 48, 48]} />
            <shaderMaterial
                uniforms={uniforms}
                transparent
                vertexShader={/* glsl */ `
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vView = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }
        `}
                fragmentShader={/* glsl */ `
          varying vec3 vNormal;
          varying vec3 vView;
          uniform vec3 uRim;
          uniform vec3 uHot;

          void main() {
            // Key light from upper-left, well outside the frame.
            vec3 lightDir = normalize(vec3(-0.75, 0.5, 0.42));
            float lambert = max(dot(vNormal, lightDir), 0.0);
            float fresnel = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.6);

            vec3 body = mix(vec3(0.024, 0.024, 0.038), uRim * 0.55, pow(lambert, 1.4));
            vec3 col = body + uHot * fresnel * 0.5 + uRim * fresnel * 0.45;

            float alpha = 0.5 + fresnel * 0.5 + lambert * 0.3;
            gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
          }
        `}
            />
        </mesh>
    );
}

/* ────────────────────────────────────────────────────────────
   CAMERA RIG
   Everything the camera does is damped toward a target, never set
   directly — that's what keeps fast scrolling from feeling jerky.
   ──────────────────────────────────────────────────────────── */
function CameraRig() {
    const { camera } = useThree();
    const target = useRef({ x: 0, y: 0, rx: 0, ry: 0 });

    useFrame((_, delta) => {
        const d = Math.min(delta, 0.05);
        const damp = 1 - Math.pow(0.0016, d);

        // Cursor pulls the camera a little; scroll banks it slightly.
        target.current.x = motionState.pointerX * 0.85;
        target.current.y = -motionState.pointerY * 0.5 + motionState.progress * 1.6;
        target.current.ry = -motionState.pointerX * 0.06;
        target.current.rx = motionState.pointerY * 0.035 - motionState.progress * 0.05;

        camera.position.x += (target.current.x - camera.position.x) * damp;
        camera.position.y += (target.current.y - camera.position.y) * damp;
        camera.rotation.y += (target.current.ry - camera.rotation.y) * damp;
        camera.rotation.x += (target.current.rx - camera.rotation.x) * damp;

        // Warp impulse from route changes decays back to rest.
        motionState.warp *= Math.pow(0.02, d);
        if (motionState.warp < 0.001) motionState.warp = 0;
    });

    return null;
}

/* ────────────────────────────────────────────────────────────
   SCENE
   ──────────────────────────────────────────────────────────── */
export default function StarfieldScene({ density = 1 }) {
    return (
        <Canvas
            dpr={[1, 1.75]}
            gl={{
                antialias: false,
                alpha: true,
                powerPreference: "high-performance",
                stencil: false,
                depth: true,
            }}
            camera={{ fov: 55, near: 0.1, far: 420, position: [0, 0, 8] }}
            style={{ pointerEvents: "none" }}
        >
            <color attach="background" args={["#050507"]} />
            <fog attach="fog" args={["#050507", 90, 260]} />

            <Nebula />
            <PlanetLimb />

            {/* Three depth layers. The near layer is sparse and fast, which is
                what sells forward motion; the far layer barely moves. */}
            <Starfield
                count={Math.round(1600 * density)}
                spread={78}
                sizeRange={[0.6, 1.6]}
                color="#F5F5F7"
                speed={2.4}
                opacity={0.55}
            />
            <Starfield
                count={Math.round(900 * density)}
                spread={52}
                sizeRange={[1.0, 2.4]}
                color="#B9D9FF"
                speed={5.2}
                opacity={0.8}
            />
            <Starfield
                count={Math.round(260 * density)}
                spread={34}
                sizeRange={[1.8, 3.6]}
                color="#C9B8FF"
                speed={9.5}
                opacity={0.95}
            />

            <CameraRig />
        </Canvas>
    );
}
