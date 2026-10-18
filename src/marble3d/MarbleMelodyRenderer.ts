import * as THREE from 'three';
import { MarbleMelodyRun, MarblePathPoint, TunedObjectInstance, WallBackground } from './types';
import { ObjectCatalog3D } from './objectCatalog';

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
  candy_pink: 0xfdf2f8,
  night_blue: 0x090d16,
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

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffedd5);

    // Camera with 30° FOV (cinematic telephoto depth)
    this.camera = new THREE.PerspectiveCamera(30, 9 / 16, 0.1, 100);
    this.camera.position.set(0, 1.8, 7.2);

    // 1. Soft Studio Ambient Light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.72);
    this.scene.add(this.ambientLight);

    // 2. Large Soft Key Area Light (produces long, soft directional shadows with contact hardening)
    this.keyAreaLight = new THREE.DirectionalLight(0xfffbeb, 1.5);
    this.keyAreaLight.position.set(2.8, 6.5, 6.2);
    this.keyAreaLight.castShadow = true;
    this.keyAreaLight.shadow.mapSize.width = 1024;
    this.keyAreaLight.shadow.mapSize.height = 1024;
    this.keyAreaLight.shadow.camera.near = 0.5;
    this.keyAreaLight.shadow.camera.far = 25;
    this.keyAreaLight.shadow.camera.left = -3;
    this.keyAreaLight.shadow.camera.right = 3;
    this.keyAreaLight.shadow.camera.top = 4;
    this.keyAreaLight.shadow.camera.bottom = -4;
    this.keyAreaLight.shadow.bias = -0.0008;
    this.keyAreaLight.shadow.radius = 3; // Soft contact shadow blur
    this.scene.add(this.keyAreaLight);

    // 3. Soft Fill Light from opposite angle
    this.softFillLight = new THREE.DirectionalLight(0xe0e7ff, 0.45);
    this.softFillLight.position.set(-3.2, -2.5, 4.5);
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
   * Generates procedural normal and roughness texture for the 3D wall
   */
  private generateProceduralWallMaterial(bg: WallBackground, colorHex: number): THREE.MeshStandardMaterial {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#8080ff'; // Flat normal base
    ctx.fillRect(0, 0, 256, 256);

    // Generate subtle micro-texture bump noise
    const imgData = ctx.getImageData(0, 0, 256, 256);
    const data = imgData.data;

    let roughness = 0.85;
    let metalness = 0.04;

    if (bg === 'matte_plaster' || bg === 'pastel_peach') {
      roughness = 0.88;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 16;
        data[i] = Math.max(0, Math.min(255, 128 + noise));
        data[i + 1] = Math.max(0, Math.min(255, 128 + noise));
        data[i + 2] = 255;
      }
    } else if (bg === 'soft_paper') {
      roughness = 0.92;
      for (let i = 0; i < data.length; i += 4) {
        const fiber = Math.sin((i / 4) * 0.2) * 8 + (Math.random() - 0.5) * 6;
        data[i] = Math.max(0, Math.min(255, 128 + fiber));
        data[i + 1] = Math.max(0, Math.min(255, 128 + fiber));
        data[i + 2] = 255;
      }
    } else if (bg === 'fine_stucco') {
      roughness = 0.95;
      for (let i = 0; i < data.length; i += 4) {
        const bump = (Math.random() - 0.5) * 24;
        data[i] = Math.max(0, Math.min(255, 128 + bump));
        data[i + 1] = Math.max(0, Math.min(255, 128 + bump));
        data[i + 2] = 255;
      }
    } else if (bg === 'satin_paint') {
      roughness = 0.38;
      metalness = 0.08;
    } else if (bg === 'light_wood' || bg === 'amber_wood') {
      roughness = 0.65;
      for (let y = 0; y < 256; y++) {
        const grain = Math.sin(y * 0.15) * 12 + (Math.random() - 0.5) * 6;
        for (let x = 0; x < 256; x++) {
          const idx = (y * 256 + x) * 4;
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
    normalMap.repeat.set(16, 400);

    return new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness,
      metalness,
      normalMap,
      normalScale: new THREE.Vector2(0.35, 0.35),
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
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
      this.renderer.setSize(canvas.clientWidth || 540, canvas.clientHeight || 960, false);
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

    // Apply Real 3D Textured Wall Material
    const wallColorHex = WALL_BACKGROUND_COLORS[run.config.wallBackground] || 0xffedd5;
    this.wallMesh.material = this.generateProceduralWallMaterial(run.config.wallBackground, wallColorHex);
    this.scene.background = new THREE.Color(wallColorHex);

    // Theme Lighting Adjustments
    if (run.config.lightingStyle === 'warm_morning') {
      this.keyAreaLight.color.setHex(0xfef08a);
      this.keyAreaLight.intensity = 1.65;
      this.bounceColorLight.color.setHex(0xfb923c);
    } else if (run.config.lightingStyle === 'cool_daylight') {
      this.keyAreaLight.color.setHex(0xf0f9ff);
      this.keyAreaLight.intensity = 1.35;
      this.bounceColorLight.color.setHex(0x38bdf8);
    } else if (run.config.lightingStyle === 'golden_hour') {
      this.keyAreaLight.color.setHex(0xfbbf24);
      this.keyAreaLight.intensity = 1.8;
      this.bounceColorLight.color.setHex(0xf43f5e);
    } else if (run.config.lightingStyle === 'colourful_bounce') {
      this.keyAreaLight.color.setHex(0xffffff);
      this.bounceColorLight.color.setHex(0xa855f7);
      this.bounceColorLight.intensity = 1.4;
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

    // Place Embossed Handles
    for (const h of run.embossedHandles) {
      const hMesh = ObjectCatalog3D.createEmbossedHandleMesh(h);
      this.scene.add(hMesh);
      this.objectMeshes.set(`handle_${h.id}`, hMesh);
    }

    // Create 3D Marbles with PBR Physical Materials (scaled 5-7% of frame width)
    for (let i = 0; i < run.lanes.length; i++) {
      const lane = run.lanes[i];
      const radius = lane.marbleRadius || 0.075;
      const sphereGeo = new THREE.SphereGeometry(radius, 32, 32);

      let sphereMat: THREE.Material;
      if (run.config.marbleStyle === 'chrome') {
        sphereMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          metalness: 0.98,
          roughness: 0.08,
        });
      } else if (run.config.marbleStyle === 'pearl') {
        sphereMat = new THREE.MeshPhysicalMaterial({
          color: 0xfdf4ff,
          roughness: 0.12,
          transmission: 0.35,
          clearcoat: 1.0,
          clearcoatRoughness: 0.08,
        });
      } else if (run.config.marbleStyle === 'neon_core') {
        sphereMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(lane.marbleColor),
          emissive: new THREE.Color(lane.marbleColor),
          emissiveIntensity: 0.65,
          roughness: 0.18,
        });
      } else {
        // Refractive Glass Swirl
        sphereMat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(lane.marbleColor),
          transmission: 0.88,
          roughness: 0.06,
          ior: 1.52,
          thickness: 0.45,
          transparent: true,
          opacity: 0.96,
        });
      }

      const marbleMesh = new THREE.Mesh(sphereGeo, sphereMat);
      marbleMesh.castShadow = true;
      marbleMesh.name = `marble_${i}`;
      this.scene.add(marbleMesh);
      this.marbleMeshes.push(marbleMesh);
    }

    this.initParticles();

    // Reset Camera State
    this.currentCamY = 1.0;
    this.currentCamX = 0;
    this.camVelY = 0;
    this.camVelX = 0;
    this.smoothedPathCenterX = 0;
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

    if (this.sparkleParticles) {
      const count = 10;
      for (let i = 0; i < count; i++) {
        const idx = (Math.floor(Math.random() * 90)) * 3;
        this.particlePositions[idx] = pos.x;
        this.particlePositions[idx + 1] = pos.y;
        this.particlePositions[idx + 2] = pos.z + 0.08;

        this.particleVelocities[idx] = (Math.random() - 0.5) * 3;
        this.particleVelocities[idx + 1] = (Math.random() - 0.5) * 3;
        this.particleVelocities[idx + 2] = Math.random() * 2;
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

    let targetCamY = 0;
    let rawMarbleX = 0;

    // Update Marble Meshes
    for (let l = 0; l < this.run.lanes.length; l++) {
      const lane = this.run.lanes[l];
      const marble = this.marbleMeshes[l];
      if (!marble || lane.points.length === 0) continue;

      const ptIdx = Math.min(lane.points.length - 1, Math.max(0, Math.floor(time * 240)));
      const pt = lane.points[ptIdx];

      marble.position.set(pt.x, pt.y, pt.z);
      marble.rotation.set(pt.rotX, pt.rotY, pt.rotZ);

      if (pt.state === 'hit') {
        marble.scale.set(1.2, 0.8, 1.2);
        this.triggerObjectHit(pt.hitObjectId || '', { x: pt.x, y: pt.y, z: pt.z }, lane.marbleColor);
      } else {
        marble.scale.lerp(new THREE.Vector3(1, 1, 1), 0.2);
      }

      if (l === 0) {
        rawMarbleX = pt.x;
        // Look-ahead: Camera leads marble by 0.4s (approx 0.45 units downward)
        targetCamY = pt.y - 0.45;
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

    this.camera.position.set(this.currentCamX, this.currentCamY + camTiltYOffset, camDistZ);
    this.camera.lookAt(this.currentCamX, this.currentCamY - 0.35, 0);
    this.camera.rotation.z = actTiltZ;

    // Area Key Light follows camera down the wall to maintain consistent long soft cast shadows
    this.keyAreaLight.position.set(this.currentCamX + 2.8, this.currentCamY + 6.5, 6.2);
    this.keyAreaLight.target.position.set(this.currentCamX, this.currentCamY, 0);
    this.keyAreaLight.target.updateMatrixWorld();

    // Color bleed light moves with primary marble
    this.bounceColorLight.position.set(rawMarbleX, targetCamY + 0.45, 0.4);

    // Drifting light leak
    this.lightLeakMesh.position.set(this.currentCamX + 0.4 + Math.sin(time * 0.5) * 0.3, this.currentCamY, 0.08);

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

    // Update Object Wobbles
    this.objectWobbles.forEach((wobble, id) => {
      const mesh = this.objectMeshes.get(id);
      if (mesh) {
        mesh.rotation.x += wobble.intensity * 0.06 * (Math.random() - 0.5);
        mesh.rotation.y += wobble.intensity * 0.06 * (Math.random() - 0.5);
        wobble.intensity *= wobble.decay;
        if (wobble.intensity < 0.01) {
          this.objectWobbles.delete(id);
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
