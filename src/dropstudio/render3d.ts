import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ballAt, cameraAt, H, hitIndexAt, onPendulum, W, type Prop, type Scene } from './scene';
import { PALETTES, renderOverlays, type Material, type Palette, type RenderOptions } from './render';

/**
 * Real 3D renderer (WebGL / Three.js) for Drop Studio scenes. Like the 2D renderer it is a pure
 * function of (scene, t): balls come from the closed-form keyframes, effects from hit times —
 * so preview, scrubbing and export are frame-identical. Works on a page canvas and on an
 * OffscreenCanvas inside the export worker.
 *
 * - Balls: one InstancedMesh (PBR materials: glossy clearcoat, transmissive glass, metal, neon, rubber)
 * - Trails, glow rings, particles and glass shards: pooled InstancedMeshes (no per-frame objects)
 * - Props: real 3D geometry (box stairs/platforms, torus rings, lathe funnel and bowl), shadowed
 * - Camera: static (slight top-down tilt), slow orbit (true 3D orbit) or follow
 */

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

const FOV = 30;
const DIST = (H / 2) / Math.tan(((FOV / 2) * Math.PI) / 180);
const MAX_TRAIL = 7;
const MAX_RINGS = 48;
const MAX_PARTICLES = 640;
const MAX_SHARDS = 160;

const toX = (x: number) => x - W / 2;
const toY = (y: number) => H / 2 - y;

function hash(a: number, b: number): number {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function makeCanvas(w: number, h: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function gradientTexture(p: (typeof PALETTES)[Palette]): THREE.Texture {
  const c = makeCanvas(64, 512);
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  const lin = g.createLinearGradient(0, 0, 0, 512);
  lin.addColorStop(0, p.bgTop);
  lin.addColorStop(1, p.bgBottom);
  g.fillStyle = lin;
  g.fillRect(0, 0, 64, 512);
  const tex = new THREE.CanvasTexture(c as any);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function haloTexture(): THREE.Texture {
  const c = makeCanvas(128, 128);
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,0.9)');
  r.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c as any);
}

function ballMaterial(m: Material): THREE.Material {
  switch (m) {
    case 'glass':
      return new THREE.MeshPhysicalMaterial({ roughness: 0.03, metalness: 0, transmission: 1, thickness: 50, ior: 1.45, clearcoat: 1, clearcoatRoughness: 0.05 });
    case 'metal':
      return new THREE.MeshStandardMaterial({ metalness: 1, roughness: 0.2 });
    case 'neon':
      return new THREE.MeshBasicMaterial({ toneMapped: false });
    case 'rubber':
      return new THREE.MeshStandardMaterial({ metalness: 0, roughness: 0.85 });
    default:
      return new THREE.MeshPhysicalMaterial({ metalness: 0, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06 });
  }
}

interface Animated {
  p: Prop;
  obj: THREE.Object3D;
  mat?: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial | THREE.MeshBasicMaterial;
}

interface BuiltScene {
  group: THREE.Group;
  animated: Animated[];
  floorY: number;
  pivot: Prop | null;
  dispose: () => void;
}

export interface Renderer3DOptions {
  shadows?: boolean;
  /** Shadow map size (preview 1024, export 2048) */
  shadowSize?: number;
  antialias?: boolean;
  /** How many built scenes stay cached on the GPU (preview: a few, thumbnails: one per style) */
  maxCached?: number;
}

export class DropRenderer3D {
  readonly canvas: AnyCanvas;
  private renderer: THREE.WebGLRenderer;
  private scene3 = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, W / H, 50, 20000);
  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private flashLight: THREE.PointLight;
  private balls: THREE.InstancedMesh;
  private ballMat: THREE.Material;
  private halos: THREE.InstancedMesh;
  private trails: THREE.InstancedMesh;
  private rings: THREE.InstancedMesh;
  private particles: THREE.InstancedMesh;
  private shards: THREE.InstancedMesh;
  private rope: THREE.Line;
  private built = new Map<Scene, BuiltScene>();
  private active: BuiltScene | null = null;
  private look: { material: Material; palette: Palette } = { material: 'glossy', palette: 'neon' };
  private bgTex: THREE.Texture | null = null;
  private width: number;
  private maxCached: number;
  private height: number;
  // Scratch (no allocations per frame)
  private m4 = new THREE.Matrix4();
  private v3 = new THREE.Vector3();
  private s3 = new THREE.Vector3();
  private q = new THREE.Quaternion();
  private qFlat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  private col = new THREE.Color();
  private eul = new THREE.Euler();
  private tmp = new Float64Array(4);
  private cam = new Float64Array(3);

  constructor(canvas: AnyCanvas, width: number, height: number, o: Renderer3DOptions = {}) {
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    this.maxCached = o.maxCached ?? 4;
    this.renderer = new THREE.WebGLRenderer({ canvas: canvas as any, antialias: o.antialias ?? true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = o.shadows ?? true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene3.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    // Studio reflections for the balls without washing the dark set out
    this.scene3.environmentIntensity = 0.5;
    pmrem.dispose();

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x101018, 0.35);
    this.scene3.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.sun.castShadow = o.shadows ?? true;
    const ss = o.shadowSize ?? 1024;
    this.sun.shadow.mapSize.set(ss, ss);
    const sc = this.sun.shadow.camera as THREE.OrthographicCamera;
    sc.left = -1400;
    sc.right = 1400;
    sc.top = 1600;
    sc.bottom = -1600;
    sc.near = 100;
    sc.far = 6000;
    this.sun.shadow.bias = -0.0005;
    this.scene3.add(this.sun);
    this.scene3.add(this.sun.target);
    this.flashLight = new THREE.PointLight(0xffffff, 0, 1600, 1.6);
    this.scene3.add(this.flashLight);

    this.ballMat = ballMaterial('glossy');
    this.balls = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 40, 28), this.ballMat, 1);
    this.balls.castShadow = true;
    this.balls.frustumCulled = false;
    this.scene3.add(this.balls);

    const haloMat = new THREE.MeshBasicMaterial({ map: haloTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    this.halos = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), haloMat, 1);
    this.halos.frustumCulled = false;
    this.scene3.add(this.halos);

    this.trails = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.28, depthWrite: false, toneMapped: false }), 1);
    this.trails.frustumCulled = false;
    this.scene3.add(this.trails);

    const additive = () => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
    this.rings = new THREE.InstancedMesh(new THREE.RingGeometry(0.86, 1, 64), additive(), MAX_RINGS);
    this.rings.frustumCulled = false;
    this.particles = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), additive(), MAX_PARTICLES);
    this.particles.frustumCulled = false;
    this.shards = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshPhysicalMaterial({ transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0, clearcoat: 1 }),
      MAX_SHARDS
    );
    this.shards.frustumCulled = false;
    this.scene3.add(this.rings, this.particles, this.shards);
    for (const m of [this.rings, this.particles, this.shards]) {
      m.count = 0;
      m.setColorAt(0, new THREE.Color(1, 1, 1));
    }

    this.rope = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xe2e8f0 }));
    this.rope.frustumCulled = false;
    this.scene3.add(this.rope);
    this.setLook('glossy', 'neon');
  }

  static supported(): boolean {
    try {
      const c = makeCanvas(2, 2) as any;
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
  }

  /** Material / palette change: updates materials only (no re-timing, no rebuild of the timing). */
  setLook(material: Material, palette: Palette): void {
    const paletteChanged = palette !== this.look.palette || !this.bgTex;
    if (material !== this.look.material) {
      this.ballMat.dispose();
      this.ballMat = ballMaterial(material);
      this.balls.material = this.ballMat;
    }
    this.look = { material, palette };
    if (paletteChanged) {
      this.bgTex?.dispose();
      this.bgTex = gradientTexture(PALETTES[palette]);
      this.scene3.background = this.bgTex;
      this.hemi.color.set(PALETTES[palette].accent).lerp(new THREE.Color(0xffffff), 0.6);
      // Props carry palette colours: rebuild their meshes (timing is untouched)
      if (this.active) this.scene3.remove(this.active.group);
      for (const b of this.built.values()) b.dispose();
      this.built.clear();
      this.active = null;
    }
  }

  dispose(): void {
    for (const b of this.built.values()) b.dispose();
    this.built.clear();
    this.renderer.dispose();
  }

  // ---------------------------------------------------------------------------------------

  private ensureCapacity(mesh: THREE.InstancedMesh, n: number): THREE.InstancedMesh {
    if (mesh.instanceMatrix.count >= n) return mesh;
    const next = new THREE.InstancedMesh(mesh.geometry, mesh.material, Math.max(n, mesh.instanceMatrix.count * 2));
    next.castShadow = mesh.castShadow;
    next.frustumCulled = false;
    next.setColorAt(0, new THREE.Color(1, 1, 1));
    this.scene3.remove(mesh);
    this.scene3.add(next);
    mesh.dispose();
    return next;
  }

  private build(s: Scene): BuiltScene {
    const pal = PALETTES[this.look.palette];
    const group = new THREE.Group();
    const animated: Animated[] = [];
    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(x: T) => {
      disposables.push(x);
      return x;
    };
    const surface = track(new THREE.MeshStandardMaterial({ color: new THREE.Color(pal.surface).multiplyScalar(0.55), roughness: 0.32, metalness: 0.55 }));
    const accent = track(new THREE.MeshBasicMaterial({ color: pal.accent, toneMapped: false }));
    const glass = track(
      new THREE.MeshPhysicalMaterial({ color: pal.accent, transparent: true, opacity: 0.32, roughness: 0.05, metalness: 0, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false })
    );
    const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z = 0) => {
      const mesh = new THREE.Mesh(track(new THREE.BoxGeometry(w, h, d)), m);
      mesh.position.set(x, y, z);
      mesh.castShadow = m !== glass;
      mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };
    let floorY = Infinity;
    let pivot: Prop | null = null;
    const pegs: Prop[] = [];

    for (const p of s.props) {
      switch (p.kind) {
        case 'floor': {
          floorY = Math.min(floorY, p.y);
          box(5200, 60, 3200, surface, 0, toY(p.y) - 30, -900);
          box(5200, 5, 8, accent, 0, toY(p.y) + 1, 220);
          break;
        }
        case 'ceiling':
          box(5200, 60, 3200, surface, 0, toY(p.y) + 30, -900);
          box(5200, 5, 8, accent, 0, toY(p.y) - 1, 220);
          break;
        case 'step': {
          const w = p.w ?? 230;
          box(w, 26, 210, surface, toX(p.x), toY(p.y) - 13, 0);
          const stripMat = track(new THREE.MeshBasicMaterial({ color: pal.accent, toneMapped: false }));
          const strip = box(w, 5, 8, stripMat, toX(p.x), toY(p.y) + 1, 106);
          animated.push({ p, obj: strip, mat: stripMat });
          // Central column piece (spiral staircase)
          const col = new THREE.Mesh(track(new THREE.CylinderGeometry(26, 26, 150, 16)), surface);
          col.position.set(0, toY(p.y) + 75, -160);
          group.add(col);
          break;
        }
        case 'platform': {
          const m = track(glass.clone());
          const slab = box(p.w ?? 360, 26, 240, m, toX(p.x), toY(p.y) - 13, 0);
          const edge = box(p.w ?? 360, 4, 6, accent, toX(p.x), toY(p.y) + 1, 121);
          const g2 = new THREE.Group();
          g2.add(slab, edge);
          group.add(g2);
          animated.push({ p, obj: g2, mat: m });
          break;
        }
        case 'ring': {
          const m = track(new THREE.MeshStandardMaterial({ color: pal.accent, emissive: pal.accent, emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.25, transparent: true }));
          const ring = new THREE.Mesh(track(new THREE.TorusGeometry(p.r ?? 150, p.big ? 12 : 8, 18, 96)), m);
          ring.position.set(toX(p.x), toY(p.y), 0);
          ring.castShadow = true;
          group.add(ring);
          animated.push({ p, obj: ring, mat: m });
          break;
        }
        case 'peg':
          pegs.push(p);
          break;
        case 'slot':
          for (let k = -4; k <= 4; k++) box(8, 200, 200, accent, toX(W / 2 + k * 120), toY(p.y - 100), 0);
          box(5200, 60, 3200, surface, 0, toY(p.y) - 30, -900);
          break;
        case 'funnel': {
          const R = p.r ?? 380;
          const yHole = p.y2 ?? p.y + 350;
          const pts: THREE.Vector2[] = [];
          for (let i = 0; i <= 24; i++) {
            const u = i / 24;
            pts.push(new THREE.Vector2(Math.max(46, R * Math.pow(1 - u, 0.85) + 34), toY(p.y + (yHole - p.y) * Math.pow(u, 1.25)) - 30));
          }
          const lathe = new THREE.Mesh(track(new THREE.LatheGeometry(pts, 72)), glass);
          lathe.position.set(toX(p.x), 0, 0);
          group.add(lathe);
          const rim = new THREE.Mesh(track(new THREE.TorusGeometry(R + 34, 6, 12, 96)), accent);
          rim.rotation.x = Math.PI / 2;
          rim.position.set(toX(p.x), toY(p.y) - 30, 0);
          group.add(rim);
          break;
        }
        case 'pivot': {
          pivot = p;
          const knob = new THREE.Mesh(track(new THREE.SphereGeometry(16, 20, 14)), surface);
          knob.position.set(toX(p.x), toY(p.y), 0);
          group.add(knob);
          box(340, 20, 60, surface, toX(p.x), toY(p.y) + 30, 0);
          break;
        }
        case 'bowl': {
          const R = p.r ?? 440;
          const pts: THREE.Vector2[] = [];
          for (let i = 0; i <= 28; i++) {
            const a = (i / 28) * (Math.PI / 2);
            pts.push(new THREE.Vector2(Math.sin(a) * R + 0.01, -Math.cos(a) * R));
          }
          const lathe = new THREE.Mesh(track(new THREE.LatheGeometry(pts, 80)), glass);
          lathe.position.set(toX(p.x), toY(p.y), 0);
          group.add(lathe);
          const rim = new THREE.Mesh(track(new THREE.TorusGeometry(R, 7, 12, 96)), accent);
          rim.rotation.x = Math.PI / 2;
          rim.position.set(toX(p.x), toY(p.y), 0);
          group.add(rim);
          break;
        }
        case 'wall': {
          const side = p.angle ?? 1;
          const m = track(new THREE.MeshStandardMaterial({ color: pal.accent, emissive: pal.accent, emissiveIntensity: 0.35, roughness: 0.3, metalness: 0.4 }));
          const g2 = new THREE.Group();
          const up = new THREE.Mesh(track(new THREE.BoxGeometry(16, 220, 200)), m);
          up.position.set(toX(p.x + side * 8), toY(p.y), 0);
          const shelf = new THREE.Mesh(track(new THREE.BoxGeometry(150, 16, 200)), m);
          shelf.position.set(toX(p.x - side * 55), toY(p.y + 150), 0);
          shelf.rotation.z = side * 0.5;
          up.castShadow = shelf.castShadow = true;
          g2.add(up, shelf);
          group.add(g2);
          animated.push({ p, obj: g2, mat: m });
          break;
        }
        case 'stackBase': {
          const w = p.w ?? 560;
          box(w, 40, 240, surface, toX(p.x), toY(p.y) - 20, 0);
          box(12, 560, 240, glass, toX(p.x - w / 2 - 6), toY(p.y) + 280, 0);
          box(12, 560, 240, glass, toX(p.x + w / 2 + 6), toY(p.y) + 280, 0);
          box(5200, 60, 3200, surface, 0, toY(p.y) - 60, -900);
          break;
        }
      }
    }
    if (pegs.length) {
      const pegMesh = new THREE.InstancedMesh(track(new THREE.CylinderGeometry(12, 12, 120, 18)), track(new THREE.MeshStandardMaterial({ color: pal.accent, metalness: 0.8, roughness: 0.2 })), pegs.length);
      const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
      pegs.forEach((p, i) => pegMesh.setMatrixAt(i, this.m4.compose(this.v3.set(toX(p.x), toY(p.y), 0), rot, this.s3.set(1, 1, 1))));
      pegMesh.castShadow = true;
      group.add(pegMesh);
      // Back board
      box(1000, 1250, 20, surface, 0, toY(330 + 550), -80);
    }
    return { group, animated, floorY, pivot, dispose: () => disposables.forEach((d) => d.dispose()) };
  }

  private use(s: Scene): BuiltScene {
    let b = this.built.get(s);
    if (!b) {
      b = this.build(s);
      this.built.set(s, b);
      // Keep a handful of scenes (thumbnails + current); free GPU memory of the rest
      // Free GPU memory of scenes no longer shown (every regenerate makes a new scene)
      for (const [old, ob] of this.built) {
        if (this.built.size <= this.maxCached) break;
        if (old === s || ob === this.active) continue;
        ob.dispose();
        this.built.delete(old);
      }
    }
    if (this.active !== b) {
      if (this.active) this.scene3.remove(this.active.group);
      this.scene3.add(b.group);
      this.active = b;
    }
    return b;
  }

  /** Render the 3D frame at time t (no overlays). */
  render(scene: Scene, t: number, o: RenderOptions): void {
    if (o.material !== this.look.material || o.palette !== this.look.palette) this.setLook(o.material, o.palette);
    const part = scene.parts ? scene.parts.find((p) => t >= p.t0 && t < p.t1) ?? scene.parts[scene.parts.length - 1] : null;
    const s = part ? part.scene : scene;
    const b = this.use(s);
    const pal = PALETTES[o.palette];

    // ---- Camera ----
    cameraAt(s, t, this.cam);
    const cx = toX(this.cam[0]);
    const cy = toY(this.cam[1]);
    let dist = DIST / (this.cam[2] || 1);
    let yaw = 0;
    let pitch = 0.07;
    if (o.camera === 'orbit') {
      yaw = 0.34 * Math.sin((2 * Math.PI * t) / 16);
      pitch = 0.1 + 0.06 * Math.sin((2 * Math.PI * t) / 11);
      dist *= 1.02;
    }
    let shakeX = 0;
    let shakeY = 0;
    let flash = 0;
    let fx = 0;
    let fy = 0;
    for (let h = hitIndexAt(s, t - 0.6); h < s.hitT.length && s.hitT[h] <= t; h++) {
      if (s.hitTier[h] !== 1) continue;
      const d = t - s.hitT[h];
      const a = 14 * Math.exp(-9 * d);
      shakeX += a * Math.sin(d * 70 + h);
      shakeY += a * Math.cos(d * 63 + h * 1.7);
      const f = Math.exp(-6 * d);
      if (f > flash) {
        flash = f;
        fx = s.hitX[h];
        fy = s.hitY[h];
      }
    }
    // Keep the z=0 plane framed: aim at the target, the dolly distance compensates the tilt
    this.camera.position.set(cx + shakeX + dist * Math.sin(yaw) * Math.cos(pitch), cy + shakeY + dist * Math.sin(pitch), dist * Math.cos(yaw) * Math.cos(pitch));
    this.camera.lookAt(cx + shakeX, cy + shakeY, 0);
    this.camera.updateMatrixWorld();
    this.sun.position.set(cx - 700, cy + 1500, 1900);
    this.sun.target.position.set(cx, cy, 0);
    this.flashLight.color.set(pal.accent);
    // Soft accent light on major drops (kept gentle: a highlight, not a frame-wide flicker)
    this.flashLight.intensity = flash * 3.5e5;
    this.flashLight.position.set(toX(fx), toY(fy) + 120, 260);

    // ---- Animated props ----
    const viewTop = this.cam[1] - H / 2 - 600;
    const viewBottom = this.cam[1] + H / 2 + 600;
    let shardN = 0;
    for (const a of b.animated) {
      const p = a.p;
      a.obj.visible = p.y > viewTop && p.y < viewBottom;
      if (!a.obj.visible) continue;
      const since = p.t !== undefined ? t - p.t : Infinity;
      const hitFlash = since >= 0 && since < 0.4 ? 1 - since / 0.4 : 0;
      if (p.kind === 'step' && a.mat) (a.mat as THREE.MeshBasicMaterial).color.set(pal.accent).lerp(this.col.set(0xffffff), hitFlash);
      else if (p.kind === 'wall' && a.mat) (a.mat as THREE.MeshStandardMaterial).emissiveIntensity = 0.35 + 2.2 * hitFlash;
      else if (p.kind === 'ring' && a.mat) {
        const m = a.mat as THREE.MeshStandardMaterial;
        // Horizontal ring (ball falls through the hole), tilting and wobbling as it spins
        a.obj.rotation.set(Math.PI / 2 + 0.32 * Math.sin(t * 1.3 + (p.angle ?? 0)), 0, 0.42 * Math.sin(t * 1.6 + (p.angle ?? 0) * 2));
        m.emissiveIntensity = 0.6 + 3 * hitFlash;
        if (p.big && since >= 0) {
          const u = Math.min(1, since / 0.5);
          a.obj.scale.setScalar(1 + 1.4 * u);
          m.opacity = 1 - u;
          a.obj.visible = u < 1;
        } else {
          a.obj.scale.setScalar(1 + (since >= 0 && since < 0.3 ? 0.25 * (1 - since / 0.3) : 0));
          m.opacity = 1;
        }
      } else if (p.kind === 'platform') {
        a.obj.visible = since < 0;
        if (since >= 0 && since < 1.2) {
          const w = p.w ?? 360;
          const n = p.big ? 12 : 8;
          for (let i = 0; i < n && shardN < MAX_SHARDS; i++) {
            const fxp = (i + 0.5) / n - 0.5;
            const vx = fxp * 520 + (hash(p.x | 0, i) - 0.5) * 160;
            const vy = -120 - hash(i, p.y | 0) * 260;
            const vz = (hash(i * 7, p.y | 0) - 0.5) * 500;
            const x = p.x + fxp * w + vx * since;
            const y = p.y + vy * since + 0.5 * 2400 * since * since;
            const k = Math.max(0, 1 - since / 1.2);
            this.q.setFromEuler(this.eul.set(since * (3 + i), since * (2 + i * 0.5), since * (4 + i)));
            this.shards.setMatrixAt(shardN, this.m4.compose(this.v3.set(toX(x), toY(y), vz * since), this.q, this.s3.set((w / n) * k, 18 * k, 120 * k)));
            this.shards.setColorAt(shardN, this.col.set(pal.accent));
            shardN++;
          }
        }
      }
    }
    this.shards.count = shardN;
    this.shards.instanceMatrix.needsUpdate = true;
    if (this.shards.instanceColor) this.shards.instanceColor.needsUpdate = true;

    // ---- Balls (+ halos for neon, trails) ----
    const n = s.ballR.length;
    this.balls = this.ensureCapacity(this.balls, n);
    const neon = o.material === 'neon';
    this.halos = this.ensureCapacity(this.halos, neon ? n : 1);
    this.trails = this.ensureCapacity(this.trails, o.trail ? n * MAX_TRAIL : 1);
    let bi = 0;
    let ti = 0;
    let hi = 0;
    this.rope.visible = false;
    for (let i = 0; i < n; i++) {
      if (!ballAt(s, i, t, this.tmp)) continue;
      const x = this.tmp[0];
      const y = this.tmp[1];
      const z = this.tmp[3];
      const vis = this.tmp[2];
      if (y < viewTop || y > viewBottom) continue;
      const r = s.ballR[i] * (0.4 + 0.6 * vis);
      const color = pal.balls[s.ballColor[i] % pal.balls.length];
      let squash = 0;
      for (let h = hitIndexAt(s, t - 0.08); h < s.hitT.length && s.hitT[h] <= t + 0.08; h++) {
        if (s.hitBall[h] !== i) continue;
        const amt = (s.hitTier[h] === 1 ? 0.3 : s.hitTier[h] === 2 ? 0.18 : 0.09) * Math.exp(-Math.abs(t - s.hitT[h]) / 0.03);
        if (amt > squash) squash = amt;
      }
      this.q.identity();
      this.balls.setMatrixAt(bi, this.m4.compose(this.v3.set(toX(x), toY(y + r * squash), z), this.q, this.s3.set(r * (1 + squash), r * (1 - squash), r * (1 + squash))));
      this.balls.setColorAt(bi, this.col.set(color));
      bi++;
      if (neon) {
        this.halos.setMatrixAt(hi, this.m4.compose(this.v3.set(toX(x), toY(y), z + 1), this.camera.quaternion, this.s3.set(r * 4.2, r * 4.2, 1)));
        this.halos.setColorAt(hi, this.col.set(color));
        hi++;
      }
      if (b.pivot && onPendulum(s, i, t) >= 0) {
        const pos = this.rope.geometry.attributes.position as THREE.BufferAttribute;
        pos.setXYZ(0, toX(b.pivot.x), toY(b.pivot.y), 0);
        pos.setXYZ(1, toX(x), toY(y), z);
        pos.needsUpdate = true;
        this.rope.visible = true;
      }
    }
    if (o.trail) {
      for (let i = 0; i < n; i++) {
        const color = pal.balls[s.ballColor[i] % pal.balls.length];
        for (let j = 1; j <= MAX_TRAIL; j++) {
          if (!ballAt(s, i, t - j * 0.024, this.tmp)) continue;
          if (this.tmp[1] < viewTop || this.tmp[1] > viewBottom) continue;
          const r = s.ballR[i] * (1 - j * 0.09) * this.tmp[2];
          this.q.identity();
          this.trails.setMatrixAt(ti, this.m4.compose(this.v3.set(toX(this.tmp[0]), toY(this.tmp[1]), this.tmp[3]), this.q, this.s3.set(r, r, r)));
          this.trails.setColorAt(ti, this.col.set(color).multiplyScalar(1 - j / (MAX_TRAIL + 1)));
          ti++;
        }
      }
    }
    this.balls.count = bi;
    this.halos.count = hi;
    this.trails.count = ti;
    for (const m of [this.balls, this.halos, this.trails]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }

    // ---- Impact effects ----
    let ri = 0;
    let pi = 0;
    for (let h = hitIndexAt(s, t - 0.9); h < s.hitT.length && s.hitT[h] <= t; h++) {
      const d = t - s.hitT[h];
      const tier = s.hitTier[h];
      const hx = s.hitX[h];
      const hy = s.hitY[h];
      if (hy < viewTop || hy > viewBottom) continue;
      const life = tier === 1 ? 0.75 : tier === 2 ? 0.4 : 0.22;
      if (d < life && ri < MAX_RINGS) {
        const u = d / life;
        const R = (tier === 1 ? 240 : tier === 2 ? 100 : 45) * (0.15 + 0.85 * Math.sqrt(u));
        this.rings.setMatrixAt(ri, this.m4.compose(this.v3.set(toX(hx), toY(hy) + 2, 0), this.qFlat, this.s3.set(R, R, R)));
        this.rings.setColorAt(ri, this.col.set(pal.accent).multiplyScalar((1 - u) * (tier === 1 ? 1.6 : 1)));
        ri++;
      }
      const count = tier === 1 ? 22 : tier === 2 ? 8 : 0;
      for (let qn = 0; qn < count && pi < MAX_PARTICLES; qn++) {
        const pl = 0.5 + hash(h, qn * 3) * 0.4;
        if (d > pl) continue;
        const ang = Math.PI + hash(h, qn * 3 + 1) * Math.PI;
        const spd = (tier === 1 ? 650 : 380) * (0.4 + 0.6 * hash(h, qn * 3 + 2));
        const vz = (hash(h * 3, qn) - 0.5) * spd;
        const px = hx + Math.cos(ang) * spd * d;
        const py = hy + Math.sin(ang) * spd * d + 0.5 * 1400 * d * d;
        const sz = (tier === 1 ? 9 : 6) * (1 - d / pl);
        this.q.setFromAxisAngle(this.v3.set(0.3, 1, 0.2).normalize(), d * 9 + qn);
        this.particles.setMatrixAt(pi, this.m4.compose(this.v3.set(toX(px), toY(py), vz * d), this.q, this.s3.set(sz, sz, sz)));
        this.particles.setColorAt(pi, this.col.set(pal.balls[qn % pal.balls.length]).multiplyScalar(1.4 * (1 - d / pl)));
        pi++;
      }
    }
    this.rings.count = ri;
    this.particles.count = pi;
    for (const m of [this.rings, this.particles]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }

    this.renderer.render(this.scene3, this.camera);
  }

  /** 3D frame + overlays composited into a 2D context (export / thumbnails). */
  composite(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, scene: Scene, t: number, o: RenderOptions): void {
    this.render(scene, t, o);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.canvas as CanvasImageSource, 0, 0, this.width, this.height);
    renderOverlays(ctx, scene, t, this.width, o);
  }
}
