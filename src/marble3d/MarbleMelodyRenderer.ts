import * as THREE from 'three';
import { MarbleMelodyRun, MarblePathPoint, TunedObjectInstance, WallBackground } from './types';
import { ObjectCatalog3D } from './objectCatalog';
import { MarbleMaterialLibrary } from './materials';

// Studio Wall Background Base Colors
const WALL_BACKGROUND_COLORS: Record<string, number> = {
  pastel_peach: 0xffedd5,
  pastel_mint: 0xdcfce7,
  pastel_lavender: 0xf3e8ff,
  pastel_sky: 0xe0f2fe,
  cream: 0xfefce8,
  blush: 0xfce7f3,
  sand: 0xfef3c7,
  soft_grey: 0xf1f5f9,
  matte_plaster: 0xffedd5,
  soft_paper: 0xfefcf6,
  fine_stucco: 0xf3f4f6,
  satin_paint: 0xfdf4ff,
  light_wood: 0xfef3c7,
  frosted_acrylic: 0xe0f2fe,
  soft_fabric: 0xfce7f3,
  neon_grid: 0x090a16,
  starfield: 0x050714,
  amber_wood: 0x451a03,
  red_gold: 0x450a0a,
  deep_teal: 0x042f2e,
  lilac: 0xf5f3ff,
  mint: 0xecfdf5,
  pastel_pink: 0xfdf2f8,
  night_blue: 0x090d16,
  charcoal_studio: 0x2c2c30,
  soft_lavender_grey: 0xcfcbd8,
  off_white_gallery: 0xe9e7ec,
  warm_greige: 0x8e857c,
  deep_navy_velvet: 0x0f172a,
  grass_field: 0x15803d,
  night_sky_clouds: 0x1e1b4b,
};

export class MarbleMelodyRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  // Studio Directional & Area Lights
  private ambientLight: THREE.AmbientLight;
  private keyAreaLight: THREE.DirectionalLight;
  private softFillLight: THREE.DirectionalLight;
  private bounceColorLight: THREE.PointLight;
  private lightLeakMesh: THREE.Mesh;

  // Scene Meshes
  private wallMesh: THREE.Mesh;
  private objectMeshes: Map<string, THREE.Group> = new Map();
  private marbleMeshes: THREE.Mesh[] = [];
  private embossedTextMeshes: THREE.Group[] = [];
  private splitPianoKeys: THREE.Mesh[] = [];

  // Layer B: Foreground Floating Bokeh & Dust Motes
  private dustPoints: THREE.Points | null = null;
  private dustPositions: Float32Array = new Float32Array(0);

  // Sparkle Burst Particles
  private sparkleParticles: THREE.Points | null = null;
  private particlePositions: Float32Array = new Float32Array(0);
  private particleVelocities: Float32Array = new Float32Array(0);

  // Active Solved Run
  private run: MarbleMelodyRun | null = null;

  // Camera Motion State (Critically Damped Tracking)
  private currentCamY: number = 0;
  private currentCamX: number = 0;
  private camVelY: number = 0;
  private camVelX: number = 0;
  private smoothedPathCenterX: number = 0;

  // Object Impact Wobble State
  private objectWobbles: Map<string, { intensity: number; decay: number }> = new Map();

  // Playback sync tracking
  private lastUpdateTime: number = -1;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffedd5);

    // Studio Look: Long-lens look (FOV 22°), tilted ~10° for real depth and side profile
    this.camera = new THREE.PerspectiveCamera(22, 9 / 16, 0.1, 120);
    this.camera.position.set(0, 1.8, 9.2);

    // 1. Soft Studio Ambient Light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.72);
    this.scene.add(this.ambientLight);

    // 2. Large Soft Key Area Light from TOP-LEFT (produces ≈45° down-right soft shadows)
    this.keyAreaLight = new THREE.DirectionalLight(0xfffbeb, 1.6);
    this.keyAreaLight.position.set(-4.5, 6.0, 5.5);
    this.keyAreaLight.castShadow = true;
    this.keyAreaLight.shadow.mapSize.width = 1024;
    this.keyAreaLight.shadow.mapSize.height = 1024;
    this.keyAreaLight.shadow.camera.near = 0.5;
    this.keyAreaLight.shadow.camera.far = 30;
    this.keyAreaLight.shadow.camera.left = -4;
    this.keyAreaLight.shadow.camera.right = 4;
    this.keyAreaLight.shadow.camera.top = 5;
    this.keyAreaLight.shadow.camera.bottom = -5;
    this.keyAreaLight.shadow.bias = -0.0008;
    this.keyAreaLight.shadow.radius = 3.5; // Soft contact shadow blur
    this.scene.add(this.keyAreaLight);

    // 3. Soft Fill Light from opposite angle (bottom-right)
    this.softFillLight = new THREE.DirectionalLight(0xe0e7ff, 0.45);
    this.softFillLight.position.set(3.8, -3.2, 4.2);
    this.scene.add(this.softFillLight);

    // 4. Color Bleed Point Light (drifts with marble to cast subtle colored glow on the wall)
    this.bounceColorLight = new THREE.PointLight(0xf472b6, 0.85, 4.5);
    this.bounceColorLight.position.set(0, 0, 0.6);
    this.scene.add(this.bounceColorLight);

    // 5. Light Leak Mesh (gentle warm colored vignette drifting across the wall)
    const leakGeo = new THREE.PlaneGeometry(8, 8);
    const leakCanvas = this.createLightLeakCanvas();
    const leakTexture = new THREE.CanvasTexture(leakCanvas);
    const leakMat = new THREE.MeshBasicMaterial({
      map: leakTexture,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.lightLeakMesh = new THREE.Mesh(leakGeo, leakMat);
    this.lightLeakMesh.position.set(0.8, 0, 0.08);
    this.scene.add(this.lightLeakMesh);

    // 6. The 3D Wall (Layer A): Physically Based Surface with procedural texture
    const wallGeo = new THREE.PlaneGeometry(12, 400);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xffedd5,
      roughness: 0.85,
      metalness: 0.04,
    });
    this.wallMesh = new THREE.Mesh(wallGeo, wallMat);
    this.wallMesh.position.set(0, -100, 0);
    this.wallMesh.receiveShadow = true;
    this.scene.add(this.wallMesh);

    // 7. Layer B: Foreground Dust Motes and Bokeh Highlights
    this.initForegroundBokeh();
  }

  /**
   * Generates procedural normal and roughness texture for the 8K 3D wall
   */
  private generateProceduralWallMaterial(bg: WallBackground, colorHex: number): THREE.MeshStandardMaterial {
    const canvas = document.createElement('canvas');
    const size = 1024;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#8080ff'; // Flat normal base
    ctx.fillRect(0, 0, size, size);

    // Generate subtle micro-texture bump noise with 8K sub-pixel precision
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;

    let roughness = 0.85;
    let metalness = 0.04;

    if (bg === 'matte_plaster' || bg === 'pastel_peach') {
      roughness = 0.88;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 18;
        data[i] = Math.max(0, Math.min(255, 128 + noise));
        data[i + 1] = Math.max(0, Math.min(255, 128 + noise));
        data[i + 2] = 255;
      }
    } else if (bg === 'soft_paper') {
      roughness = 0.92;
      for (let i = 0; i < data.length; i += 4) {
        const fiber = Math.sin((i / 4) * 0.05) * 10 + (Math.random() - 0.5) * 8;
        data[i] = Math.max(0, Math.min(255, 128 + fiber));
        data[i + 1] = Math.max(0, Math.min(255, 128 + fiber));
        data[i + 2] = 255;
      }
    } else if (bg === 'fine_stucco') {
      roughness = 0.95;
      for (let i = 0; i < data.length; i += 4) {
        const bump = (Math.random() - 0.5) * 28;
        data[i] = Math.max(0, Math.min(255, 128 + bump));
        data[i + 1] = Math.max(0, Math.min(255, 128 + bump));
        data[i + 2] = 255;
      }
    } else if (bg === 'satin_paint') {
      roughness = 0.38;
      metalness = 0.08;
    } else if (bg === 'light_wood' || bg === 'amber_wood') {
      roughness = 0.65;
      for (let y = 0; y < size; y++) {
        const grain = Math.sin(y * 0.06) * 14 + (Math.random() - 0.5) * 8;
        for (let x = 0; x < size; x++) {
          const idx = (y * size + x) * 4;
          data[idx] = Math.max(0, Math.min(255, 128 + grain));
          data[idx + 1] = 128;
          data[idx + 2] = 255;
        }
      }
    } else if (bg === 'neon_grid') {
      roughness = 0.25;
      metalness = 0.3;
    }

    ctx.putImageData(imgData, 0, 0);

    const normalMap = new THREE.CanvasTexture(canvas);
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.generateMipmaps = true;
    normalMap.minFilter = THREE.LinearMipmapLinearFilter;
    normalMap.magFilter = THREE.LinearFilter;
    normalMap.anisotropy = 16;
    normalMap.repeat.set(16, 400);

    return new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness,
      metalness,
      normalMap,
      normalScale: new THREE.Vector2(0.4, 0.4),
    });
  }

  /**
   * Creates subtle colored light leak gradient canvas
   */
  private createLightLeakCanvas(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d')!;

    const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 64);
    grad.addColorStop(0, 'rgba(251, 146, 60, 0.85)');
    grad.addColorStop(0.5, 'rgba(244, 114, 182, 0.35)');
    grad.addColorStop(1, 'rgba(244, 114, 182, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return c;
  }

  /**
   * Initializes Layer B foreground dust motes and bokeh
   */
  private initForegroundBokeh(): void {
    const count = 48;
    const geo = new THREE.BufferGeometry();
    this.dustPositions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      this.dustPositions[i * 3] = (Math.random() - 0.5) * 2.8;
      this.dustPositions[i * 3 + 1] = Math.random() * 8 - 4;
      this.dustPositions[i * 3 + 2] = 0.6 + Math.random() * 2.2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(this.dustPositions, 3));

    // Soft round bokeh texture
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
    g.addColorStop(0.5, 'rgba(254, 240, 138, 0.25)');
    g.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);

    const mat = new THREE.PointsMaterial({
      map: tex,
      size: 0.16,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.dustPoints = new THREE.Points(geo, mat);
    this.scene.add(this.dustPoints);
  }

  /**
   * Attaches Canvas & Configures WebGL Renderer
   */
  attachCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    if (this.renderer) {
      this.renderer.dispose();
    }

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
      const isOffscreen = !canvas.parentElement;
      this.renderer.setPixelRatio(isOffscreen ? 1.0 : Math.min(window.devicePixelRatio || 1, 2.0));
      const initialW = canvas.clientWidth || canvas.width || 1080;
      const initialH = canvas.clientHeight || canvas.height || 1920;
      this.renderer.setSize(initialW, initialH, false);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.08;
    } catch (e) {
      console.warn('WebGLRenderer init notice:', e);
    }
  }

  /**
   * Builds the complete 3D scene from a solved MarbleMelodyRun
   */
  loadRun(run: MarbleMelodyRun): void {
    this.run = run;

    // Clear previous objects
    this.objectMeshes.forEach((mesh) => this.scene.remove(mesh));
    this.objectMeshes.clear();
    this.marbleMeshes.forEach((mesh) => this.scene.remove(mesh));
    this.marbleMeshes = [];
    this.embossedTextMeshes.forEach((mesh) => this.scene.remove(mesh));
    this.embossedTextMeshes = [];
    this.splitPianoKeys.forEach((key) => this.scene.remove(key));
    this.splitPianoKeys = [];

    // 1. Apply World 10-Layer Wall Surface
    let wallColorHex = 0x2c2c30;
    if (run.config.customWallColor) {
      wallColorHex = parseInt(run.config.customWallColor.replace('#', ''), 16);
    } else if (run.config.world?.wallColor) {
      wallColorHex = parseInt(run.config.world.wallColor.replace('#', ''), 16);
    } else if (run.config.wallBackground && WALL_BACKGROUND_COLORS[run.config.wallBackground]) {
      wallColorHex = WALL_BACKGROUND_COLORS[run.config.wallBackground];
    }
    const wallType = run.config.world?.wallSurface || run.config.wallBackground || 'charcoal_studio';

    if (run.config.customWallImage) {
      const textureLoader = new THREE.TextureLoader();
      const customTex = textureLoader.load(run.config.customWallImage, (tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        const repX = run.config.customWallImageRepeatX || 1;
        const repY = run.config.customWallImageRepeatY || 10;
        tex.repeat.set(repX, repY);
        tex.needsUpdate = true;
      });
      const customMat = new THREE.MeshStandardMaterial({
        map: customTex,
        color: run.config.customWallColor ? wallColorHex : 0xffffff,
        roughness: 0.78,
        metalness: 0.04,
      });
      this.wallMesh.material = customMat;
      this.scene.background = new THREE.Color(wallColorHex);
    } else {
      this.wallMesh.material = MarbleMaterialLibrary.getWallMaterial(wallType, wallColorHex);
      this.scene.background = new THREE.Color(wallColorHex);
    }

    // 2. World Lighting Rig Configuration
    const rig = run.config.world?.lightingRig || run.config.lightingStyle;
    if (rig?.includes('moonbeam') || rig?.includes('night')) {
      this.keyAreaLight.color.setHex(0x93c5fd);
      this.keyAreaLight.intensity = 2.4;
      this.bounceColorLight.color.setHex(0x1e1b4b);
      this.bounceColorLight.intensity = 0.5;
    } else if (rig?.includes('torch') || rig?.includes('magma') || rig?.includes('furnace')) {
      this.keyAreaLight.color.setHex(0xf97316);
      this.keyAreaLight.intensity = 1.9;
      this.bounceColorLight.color.setHex(0x7c2d12);
      this.bounceColorLight.intensity = 1.2;
    } else if (rig?.includes('sunlight') || rig?.includes('golden') || rig?.includes('morning')) {
      this.keyAreaLight.color.setHex(0xfef08a);
      this.keyAreaLight.intensity = 1.8;
      this.bounceColorLight.color.setHex(0xfb923c);
      this.bounceColorLight.intensity = 1.1;
    } else if (rig?.includes('spotlight') || rig?.includes('theatrical')) {
      this.keyAreaLight.color.setHex(0xffffff);
      this.keyAreaLight.intensity = 2.8;
      this.bounceColorLight.color.setHex(0xec4899);
      this.bounceColorLight.intensity = 0.9;
    } else if (rig?.includes('neon') || rig?.includes('cyber')) {
      this.keyAreaLight.color.setHex(0x06b6d4);
      this.keyAreaLight.intensity = 1.6;
      this.bounceColorLight.color.setHex(0xec4899);
      this.bounceColorLight.intensity = 1.6;
    } else {
      this.keyAreaLight.color.setHex(0xffffff);
      this.keyAreaLight.intensity = 1.45;
      this.bounceColorLight.color.setHex(0x38bdf8);
      this.bounceColorLight.intensity = 0.9;
    }

    // Place Tuned Objects with Real Physical 3D Thickness
    for (const obj of run.objects) {
      const mesh = ObjectCatalog3D.createTunedObjectMesh(obj);
      this.scene.add(mesh);
      this.objectMeshes.set(obj.id, mesh);
    }

    // Place Catcher
    const catcherMesh = ObjectCatalog3D.createCatcherMesh(run.catcher.type);
    catcherMesh.position.set(run.catcher.x, run.catcher.y, run.catcher.z);
    this.scene.add(catcherMesh);
    this.objectMeshes.set('catcher', catcherMesh);

    // Place Decor Props (Layer C - outside play corridor)
    for (const d of run.decor) {
      const dMesh = ObjectCatalog3D.createDecorMesh(d);
      this.scene.add(dMesh);
      this.objectMeshes.set(`decor_${d.id}`, dMesh);
    }

    // Place Embossed Handles with world material
    const handleMat = run.config.world?.objectMaterial || 'brushed_gold';
    for (const h of run.embossedHandles) {
      const hMesh = ObjectCatalog3D.createEmbossedHandleMesh(h, handleMat);
      this.scene.add(hMesh);
      this.objectMeshes.set(`handle_${h.id}`, hMesh);
    }

    // Place Embossed 3D Wall Text System
    if (run.embossedWallTexts) {
      const wallColorString = '#' + wallColorHex.toString(16).padStart(6, '0');
      for (const textInst of run.embossedWallTexts) {
        const textMesh = ObjectCatalog3D.createEmbossedWallTextMesh(textInst, wallColorString);
        this.scene.add(textMesh);
        this.embossedTextMeshes.push(textMesh);
      }
    }

    // Optional Split-Screen 3D Piano Keyboard
    if (run.splitScreenConfig?.enabled && run.splitScreenConfig.show3DPiano) {
      const keyCount = 14;
      const startX = -0.72;
      const keyWidth = 0.11;
      for (let k = 0; k < keyCount; k++) {
        const isBlack = [1, 3, 6, 8, 10, 13].includes(k);
        const keyGeo = new THREE.BoxGeometry(isBlack ? 0.07 : 0.10, isBlack ? 0.32 : 0.46, 0.035);
        const keyMat = new THREE.MeshStandardMaterial({
          color: isBlack ? 0x18181b : 0xf8fafc,
          metalness: 0.1,
          roughness: isBlack ? 0.3 : 0.15,
        });
        const keyMesh = new THREE.Mesh(keyGeo, keyMat);
        keyMesh.position.set(startX + k * keyWidth, -0.85, 0.04);
        keyMesh.name = `split_piano_${k}`;
        keyMesh.userData.isBlack = isBlack;
        keyMesh.userData.baseColor = isBlack ? 0x18181b : 0xf8fafc;
        this.scene.add(keyMesh);
        this.splitPianoKeys.push(keyMesh);
      }
    }

    // Create 3D Marbles with PBR Physical Materials (scaled 5-7% of frame width)
    for (let i = 0; i < run.lanes.length; i++) {
      const lane = run.lanes[i];
      const radius = lane.marbleRadius || 0.075;
      const sphereGeo = new THREE.SphereGeometry(radius, 32, 32);

      const signature = run.config.signatureMarble;
      const marbleType = run.config.world?.marbleType || (run.config.marbleStyle as any) || 'swirl_glass';
      const sphereMat = signature
        ? new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(signature.coreColor || '#ea580c'),
            roughness: 1.0 - (signature.glossiness ?? 0.95),
            metalness: 0.08,
            transmission: 0.65,
            ior: 1.52,
            thickness: 0.45,
            clearcoat: 1.0,
            clearcoatRoughness: 0.04,
          })
        : MarbleMaterialLibrary.getMarbleMaterial(marbleType, lane.marbleColor);

      const marbleMesh = new THREE.Mesh(sphereGeo, sphereMat);
      marbleMesh.castShadow = true;
      marbleMesh.name = `marble_${i}`;
      this.scene.add(marbleMesh);
      this.marbleMeshes.push(marbleMesh);
    }

    this.initParticles();

    // Reset Camera & Timing State
    this.currentCamY = 1.0;
    this.currentCamX = 0;
    this.camVelY = 0;
    this.camVelX = 0;
    this.smoothedPathCenterX = 0;
    this.lastUpdateTime = -1;
  }

  /**
   * Sparkle Burst System
   */
  private initParticles(): void {
    if (this.sparkleParticles) {
      this.scene.remove(this.sparkleParticles);
    }
    const count = 100;
    const geo = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(count * 3);
    this.particleVelocities = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i++) {
      this.particlePositions[i] = 9999;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xfacc15,
      size: 0.06,
      transparent: true,
      opacity: 0.85,
    });
    this.sparkleParticles = new THREE.Points(geo, mat);
    this.scene.add(this.sparkleParticles);
  }

  /**
   * Triggers Hit Wobble and Particle Sparkles
   */
  triggerObjectHit(objectId: string, pos: { x: number; y: number; z: number }, colorHex?: string): void {
    const mesh = this.objectMeshes.get(objectId);
    if (!mesh) return;

    this.objectWobbles.set(objectId, {
      intensity: 0.28,
      decay: 0.9,
    });

    const hitPulse = mesh.getObjectByName('hitPulse') as THREE.Mesh;
    if (hitPulse && hitPulse.material) {
      (hitPulse.material as THREE.MeshBasicMaterial).opacity = 0.9;
      if (colorHex) {
        (hitPulse.material as THREE.MeshBasicMaterial).color.set(colorHex);
      }
    }

    // Wall Light Reaction (Specular bounce flare on hit)
    this.bounceColorLight.intensity = 2.4;
    setTimeout(() => {
      if (this.bounceColorLight) this.bounceColorLight.intensity = 1.1;
    }, 120);

    if (this.sparkleParticles) {
      const count = 12;
      for (let i = 0; i < count; i++) {
        const idx = (Math.floor(Math.random() * 90)) * 3;
        this.particlePositions[idx] = pos.x;
        this.particlePositions[idx + 1] = pos.y;
        this.particlePositions[idx + 2] = pos.z + 0.08;

        this.particleVelocities[idx] = (Math.random() - 0.5) * 3.5;
        this.particleVelocities[idx + 1] = (Math.random() - 0.5) * 3.5;
        this.particleVelocities[idx + 2] = Math.random() * 2.2;
      }
      this.sparkleParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  /**
   * Updates state at specific time (used by both 60fps preview and 4K video export)
   * Implements tilted perspective (18-22°), center band damping, look-ahead, and zero shake tracking.
   */
  updateAtTime(time: number): void {
    if (!this.run) return;

    // Determine interval for triggering hits with zero frame-skipping
    const prevT = this.lastUpdateTime < 0 || time < this.lastUpdateTime ? time - 0.018 : this.lastUpdateTime;
    this.lastUpdateTime = time;

    let targetCamY = 0;
    let rawMarbleX = 0;

    // Update Marble Meshes with silky smooth sub-frame interpolation
    for (let l = 0; l < this.run.lanes.length; l++) {
      const lane = this.run.lanes[l];
      const marble = this.marbleMeshes[l];
      if (!marble || lane.points.length === 0) continue;

      // Sub-frame linear interpolation (lerp) between 240Hz physics points
      const rawIdx = Math.max(0, Math.min(lane.points.length - 1, time * 240));
      const idxA = Math.floor(rawIdx);
      const idxB = Math.min(lane.points.length - 1, idxA + 1);
      const frac = rawIdx - idxA;

      const ptA = lane.points[idxA];
      const ptB = lane.points[idxB];

      const curX = ptA.x + (ptB.x - ptA.x) * frac;
      const curY = ptA.y + (ptB.y - ptA.y) * frac;
      const curZ = ptA.z + (ptB.z - ptA.z) * frac;
      const curRotX = ptA.rotX + (ptB.rotX - ptA.rotX) * frac;
      const curRotY = ptA.rotY + (ptB.rotY - ptA.rotY) * frac;
      const curRotZ = ptA.rotZ + (ptB.rotZ - ptA.rotZ) * frac;

      marble.position.set(curX, curY, curZ);
      marble.rotation.set(curRotX, curRotY, curRotZ);

      // Check all hits landing in (prevT, time] so no hit wobbles or sparkles are ever dropped
      let hitInFrame = false;
      for (const hit of lane.hits) {
        if ((prevT <= 0 ? hit.time >= 0 : hit.time > prevT) && hit.time <= time) {
          const obj = this.run.objects.find((o) => o.id === hit.objectId);
          if (obj) {
            this.triggerObjectHit(hit.objectId, { x: obj.x, y: obj.y, z: obj.z }, lane.marbleColor);
            hitInFrame = true;
          }
        }
      }

      if (hitInFrame) {
        marble.scale.set(1.22, 0.78, 1.22);
      } else {
        marble.scale.lerp(new THREE.Vector3(1, 1, 1), 0.18);
      }

      if (l === 0) {
        rawMarbleX = curX;
        // Look-ahead: Camera leads marble by 0.4s (approx 0.45 units downward)
        targetCamY = curY - 0.45;
      }
    }

    // Low-pass Filter for Path Center Line X (removes raw bounce shake completely)
    const dt = 1 / 60;
    this.smoothedPathCenterX += (rawMarbleX * 0.15 - this.smoothedPathCenterX) * (dt * 3.5);
    const targetCamX = this.smoothedPathCenterX;

    // Critically Damped Follow Camera in Center Band
    const springStrength = 16.0;
    const damping = 7.5;

    const forceY = (targetCamY - this.currentCamY) * springStrength - this.camVelY * damping;
    this.camVelY += forceY * dt;
    this.currentCamY += this.camVelY * dt;

    const forceX = (targetCamX - this.currentCamX) * springStrength - this.camVelX * damping;
    this.camVelX += forceX * dt;
    this.currentCamX += this.camVelX * dt;

    // Tilted Perspective Camera: 18°–22° tilt off wall normal so objects show real sides and depth
    const camTiltYOffset = 2.2;
    const camDistZ = 7.0;

    // Act variation: subtle rotation (±2°) changes gently per act
    const actIndex = Math.floor(time / (this.run.duration / 5));
    const actTiltZ = (actIndex % 2 === 0 ? 1 : -1) * 0.025;

    // Hero Moment every ~10s: close-up camera push for 0.6s
    const cycle10 = time % 10.0;
    const heroPush = cycle10 < 0.6 ? Math.sin((cycle10 / 0.6) * Math.PI) * 0.45 : 0;

    this.camera.position.set(this.currentCamX, this.currentCamY + camTiltYOffset, camDistZ - heroPush);
    this.camera.lookAt(this.currentCamX, this.currentCamY - 0.35, 0);
    this.camera.rotation.z = actTiltZ;

    // Hero Intro (first 0.8s): entrance light flare
    const introFlare = time < 0.8 ? Math.max(0, 1 - time / 0.8) * 1.2 : 0;

    // Top-Left Studio Key Light follows camera down the wall to maintain consistent 45° soft cast shadows
    this.keyAreaLight.position.set(this.currentCamX - 4.5, this.currentCamY + 6.0, 5.5);
    this.keyAreaLight.intensity = (this.keyAreaLight.intensity || 1.6) + introFlare;
    this.keyAreaLight.target.position.set(this.currentCamX, this.currentCamY, 0);
    this.keyAreaLight.target.updateMatrixWorld();

    this.softFillLight.position.set(this.currentCamX + 3.8, this.currentCamY - 3.2, 4.2);
    this.softFillLight.target.position.set(this.currentCamX, this.currentCamY, 0);
    this.softFillLight.target.updateMatrixWorld();

    // Color bleed light moves with primary marble
    this.bounceColorLight.position.set(rawMarbleX, targetCamY + 0.45, 0.4);

    // Drifting light leak
    this.lightLeakMesh.position.set(this.currentCamX + 0.4 + Math.sin(time * 0.5) * 0.3, this.currentCamY, 0.08);

    // Embossed Wall Text Reveals (Slides out of wall at revealAtTime)
    for (const tm of this.embossedTextMeshes) {
      const revealTime = tm.userData.revealAtTime;
      if (revealTime !== undefined) {
        const plane = tm.getObjectByName('text_plane') as THREE.Mesh;
        if (plane && plane.material) {
          if (time >= revealTime) {
            const progress = Math.min(1.0, (time - revealTime) / 0.55);
            (plane.material as THREE.MeshBasicMaterial).opacity = progress;
            tm.position.y = (tm.userData.initialY || 0) + (1.0 - progress) * 0.18;
          } else {
            (plane.material as THREE.MeshBasicMaterial).opacity = 0;
          }
        }
      }
    }

    // Split-Screen 3D Piano Key Illumination
    if (this.splitPianoKeys.length > 0 && this.run) {
      // Find note hits active near current time
      const activeHit = this.run.lanes.flatMap((l) => l.hits).find((h) => Math.abs(h.time - time) < 0.12);
      for (let k = 0; k < this.splitPianoKeys.length; k++) {
        const pKey = this.splitPianoKeys[k];
        const isTarget = activeHit && (activeHit.note.midi % 14) === k;
        const mat = pKey.material as THREE.MeshStandardMaterial;
        if (isTarget) {
          mat.color.setHex(0xfacc15); // Vibrant glow on strike
          pKey.position.z = 0.025;
        } else {
          mat.color.setHex(pKey.userData.baseColor);
          pKey.position.z = 0.04;
        }
      }
    }

    // Finale Camera Pull-Back: at finale downbeat, smooth pull-back revealing wall section
    const finaleTime = this.run.duration - 2.0;
    if (time >= finaleTime) {
      const finaleProgress = Math.min(1.0, (time - finaleTime) / 2.0);
      this.camera.position.z += finaleProgress * 2.8;
    }

    // Update Dust Motes / Bokeh
    if (this.dustPoints && this.dustPositions.length > 0) {
      for (let i = 0; i < this.dustPositions.length / 3; i++) {
        const idx = i * 3;
        // Drifting motion
        this.dustPositions[idx + 1] -= dt * 0.12;
        if (this.dustPositions[idx + 1] < this.currentCamY - 4) {
          this.dustPositions[idx + 1] = this.currentCamY + 4;
        }
      }
      this.dustPoints.geometry.attributes.position.needsUpdate = true;
    }

    // Update Object Wobbles & Squishes
    this.objectWobbles.forEach((wobble, id) => {
      const mesh = this.objectMeshes.get(id);
      if (mesh) {
        mesh.rotation.x += wobble.intensity * 0.06 * (Math.random() - 0.5);
        mesh.rotation.y += wobble.intensity * 0.06 * (Math.random() - 0.5);

        // Soft-Body Squash for Squeaky Duck
        if (mesh.userData.isSqueaky) {
          const duckBody = mesh.getObjectByName('duck_body');
          if (duckBody) {
            const squishRatio = wobble.intensity * 1.8;
            duckBody.scale.set(1.25 + squishRatio * 0.45, 0.95 - squishRatio * 0.55, 1.05 + squishRatio * 0.45);
          }
        }

        // Spring Bounce for Spring Smiley
        if (mesh.userData.isSpring) {
          const smileyHead = mesh.getObjectByName('smiley_head');
          if (smileyHead) {
            smileyHead.position.x = (Math.random() - 0.5) * wobble.intensity * 0.35;
          }
        }

        wobble.intensity *= wobble.decay;
        if (wobble.intensity < 0.01) {
          this.objectWobbles.delete(id);
          if (mesh.userData.isSqueaky) {
            const duckBody = mesh.getObjectByName('duck_body');
            if (duckBody) duckBody.scale.set(1.25, 0.95, 1.05);
          }
          if (mesh.userData.isSpring) {
            const smileyHead = mesh.getObjectByName('smiley_head');
            if (smileyHead) smileyHead.position.x = 0;
          }
        }

        const hitPulse = mesh.getObjectByName('hitPulse') as THREE.Mesh;
        if (hitPulse && hitPulse.material) {
          const mat = hitPulse.material as THREE.MeshBasicMaterial;
          mat.opacity = Math.max(0, mat.opacity - 0.05);
        }
      }
    });

    // Update Sparkle Particles
    if (this.sparkleParticles) {
      for (let i = 0; i < this.particlePositions.length / 3; i++) {
        const idx = i * 3;
        if (this.particlePositions[idx + 1] < 5000) {
          this.particlePositions[idx] += this.particleVelocities[idx] * dt;
          this.particlePositions[idx + 1] += this.particleVelocities[idx + 1] * dt;
          this.particlePositions[idx + 2] += this.particleVelocities[idx + 2] * dt;
          this.particleVelocities[idx + 1] -= 9.8 * dt * 0.4;
        }
      }
      this.sparkleParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  /**
   * Synchronously renders a frame for 4K vertical export (1080x1920 or 2160x3840)
   */
  renderFrameAt(time: number, targetCanvas?: HTMLCanvasElement, targetCtx?: CanvasRenderingContext2D): void {
    this.updateAtTime(time);

    if (this.renderer && targetCanvas) {
      if (
        this.renderer.domElement.width !== targetCanvas.width ||
        this.renderer.domElement.height !== targetCanvas.height
      ) {
        this.renderer.setSize(targetCanvas.width, targetCanvas.height, false);
      }
      this.camera.aspect = targetCanvas.width / targetCanvas.height;
      this.camera.updateProjectionMatrix();

      this.renderer.render(this.scene, this.camera);

      if (targetCtx && this.renderer.domElement !== targetCanvas) {
        targetCtx.drawImage(this.renderer.domElement, 0, 0, targetCanvas.width, targetCanvas.height);
      }
    }
  }
}
