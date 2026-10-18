import * as THREE from 'three';
import { MarbleMelodyRun, MarblePathPoint, TunedObjectInstance } from './types';
import { ObjectCatalog3D } from './objectCatalog';

// Studio Wall Background Colors
const WALL_BACKGROUND_COLORS: Record<string, number> = {
  pastel_peach: 0xffedd5,
  pastel_mint: 0xdcfce7,
  pastel_lavender: 0xf3e8ff,
  pastel_sky: 0xe0f2fe,
  cream: 0xfefce8,
  blush: 0xfce7f3,
  sand: 0xfef3c7,
  soft_grey: 0xf1f5f9,
};

export class MarbleMelodyRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  // Lights
  private ambientLight: THREE.AmbientLight;
  private keyLight: THREE.DirectionalLight;
  private bounceLight: THREE.PointLight;
  private rimLight: THREE.DirectionalLight;

  // Scene Objects
  private wallMesh: THREE.Mesh;
  private objectMeshes: Map<string, THREE.Group> = new Map();
  private marbleMeshes: THREE.Mesh[] = [];
  private sparkleParticles: THREE.Points | null = null;
  private particlePositions: Float32Array = new Float32Array(0);
  private particleVelocities: Float32Array = new Float32Array(0);

  // Active Run
  private run: MarbleMelodyRun | null = null;
  private animFrameId: number | null = null;
  private startTime: number = 0;
  private isPreviewRunning: boolean = false;

  // Smooth Camera State (Critically Damped)
  private currentCamY: number = 0;
  private currentCamX: number = 0;
  private camVelY: number = 0;
  private camVelX: number = 0;

  // Hit Wobble State
  private objectWobbles: Map<string, { intensity: number; decay: number; axis: THREE.Vector3 }> = new Map();

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffedd5);

    this.camera = new THREE.PerspectiveCamera(50, 9 / 16, 0.1, 100);
    this.camera.position.set(0, 0, 7.5);

    // Soft Studio Lighting
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(this.ambientLight);

    this.keyLight = new THREE.DirectionalLight(0xfffbeb, 1.4);
    this.keyLight.position.set(3, 8, 8);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.keyLight.shadow.bias = -0.001;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0xe0e7ff, 0.6);
    this.rimLight.position.set(-4, -5, 5);
    this.scene.add(this.rimLight);

    this.bounceLight = new THREE.PointLight(0xf472b6, 0.8, 12);
    this.bounceLight.position.set(0, 0, 2);
    this.scene.add(this.bounceLight);

    // Infinite Vertical Pastel Wall
    const wallGeo = new THREE.PlaneGeometry(16, 300);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xffedd5,
      roughness: 0.85,
      metalness: 0.05,
    });
    this.wallMesh = new THREE.Mesh(wallGeo, wallMat);
    this.wallMesh.position.set(0, -100, 0);
    this.wallMesh.receiveShadow = true;
    this.scene.add(this.wallMesh);
  }

  /**
   * Initializes or attaches canvas
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
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
      this.renderer.setSize(canvas.clientWidth || 540, canvas.clientHeight || 960, false);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
    } catch (e) {
      console.warn('Three.js WebGLRenderer initialization error:', e);
    }
  }

  /**
   * Builds the complete 3D scene from a solved MarbleMelodyRun
   */
  loadRun(run: MarbleMelodyRun): void {
    this.run = run;

    // Clear old objects
    this.objectMeshes.forEach((mesh) => this.scene.remove(mesh));
    this.objectMeshes.clear();
    this.marbleMeshes.forEach((mesh) => this.scene.remove(mesh));
    this.marbleMeshes = [];

    // Apply Wall & Lighting Colors
    const wallColorHex = WALL_BACKGROUND_COLORS[run.config.wallBackground] || 0xffedd5;
    (this.wallMesh.material as THREE.MeshStandardMaterial).color.setHex(wallColorHex);
    this.scene.background = new THREE.Color(wallColorHex);

    // Theme Lighting Adjustment
    if (run.config.lightingStyle === 'warm_morning') {
      this.keyLight.color.setHex(0xfef08a);
      this.keyLight.intensity = 1.6;
      this.bounceLight.color.setHex(0xfb923c);
    } else if (run.config.lightingStyle === 'cool_daylight') {
      this.keyLight.color.setHex(0xf0f9ff);
      this.keyLight.intensity = 1.3;
      this.bounceLight.color.setHex(0x38bdf8);
    } else if (run.config.lightingStyle === 'golden_hour') {
      this.keyLight.color.setHex(0xfbbf24);
      this.keyLight.intensity = 1.8;
      this.bounceLight.color.setHex(0xf43f5e);
    } else if (run.config.lightingStyle === 'colourful_bounce') {
      this.keyLight.color.setHex(0xffffff);
      this.bounceLight.color.setHex(0xa855f7);
      this.bounceLight.intensity = 1.5;
    }

    // Place Tuned Objects
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

    // Place Decor
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

    // Create 3D Marbles with PBR Physical Materials
    for (let i = 0; i < run.lanes.length; i++) {
      const lane = run.lanes[i];
      const radius = lane.marbleRadius || 0.16;
      const sphereGeo = new THREE.SphereGeometry(radius, 32, 32);

      let sphereMat: THREE.Material;
      if (run.config.marbleStyle === 'chrome') {
        sphereMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          metalness: 0.98,
          roughness: 0.1,
        });
      } else if (run.config.marbleStyle === 'pearl') {
        sphereMat = new THREE.MeshPhysicalMaterial({
          color: 0xfdf4ff,
          roughness: 0.15,
          transmission: 0.3,
          clearcoat: 1.0,
          clearcoatRoughness: 0.1,
        });
      } else if (run.config.marbleStyle === 'neon_core') {
        sphereMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(lane.marbleColor),
          emissive: new THREE.Color(lane.marbleColor),
          emissiveIntensity: 0.6,
          roughness: 0.2,
        });
      } else {
        // Default: Glass Swirl with internal refractive look
        sphereMat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(lane.marbleColor),
          transmission: 0.88,
          roughness: 0.08,
          ior: 1.52,
          thickness: 0.5,
          transparent: true,
          opacity: 0.95,
        });
      }

      const marbleMesh = new THREE.Mesh(sphereGeo, sphereMat);
      marbleMesh.castShadow = true;
      marbleMesh.name = `marble_${i}`;
      this.scene.add(marbleMesh);
      this.marbleMeshes.push(marbleMesh);
    }

    // Init Particle Sparkles
    this.initParticles();

    // Reset Camera
    this.currentCamY = 1.0;
    this.currentCamX = 0;
    this.camVelY = 0;
    this.camVelX = 0;
  }

  /**
   * Sparkle Burst Particle System
   */
  private initParticles(): void {
    if (this.sparkleParticles) {
      this.scene.remove(this.sparkleParticles);
    }
    const count = 120;
    const geo = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(count * 3);
    this.particleVelocities = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i++) {
      this.particlePositions[i] = 9999; // offscreen until burst
    }

    geo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xfacc15,
      size: 0.08,
      transparent: true,
      opacity: 0.85,
    });
    this.sparkleParticles = new THREE.Points(geo, mat);
    this.scene.add(this.sparkleParticles);
  }

  /**
   * Triggers a hit wobble on an object and particle flash
   */
  triggerObjectHit(objectId: string, pos: { x: number; y: number; z: number }, colorHex?: string): void {
    const mesh = this.objectMeshes.get(objectId);
    if (!mesh) return;

    // Wobble spring
    this.objectWobbles.set(objectId, {
      intensity: 0.35,
      decay: 0.92,
      axis: new THREE.Vector3(1, 0, 0),
    });

    // Light Pulse ring animation
    const hitPulse = mesh.getObjectByName('hitPulse') as THREE.Mesh;
    if (hitPulse && hitPulse.material) {
      (hitPulse.material as THREE.MeshBasicMaterial).opacity = 0.9;
      if (colorHex) {
        (hitPulse.material as THREE.MeshBasicMaterial).color.set(colorHex);
      }
    }

    // Sparkle burst
    if (this.sparkleParticles) {
      const count = 15;
      for (let i = 0; i < count; i++) {
        const idx = (Math.floor(Math.random() * 100)) * 3;
        this.particlePositions[idx] = pos.x;
        this.particlePositions[idx + 1] = pos.y;
        this.particlePositions[idx + 2] = pos.z + 0.1;

        this.particleVelocities[idx] = (Math.random() - 0.5) * 4;
        this.particleVelocities[idx + 1] = (Math.random() - 0.5) * 4;
        this.particleVelocities[idx + 2] = Math.random() * 3;
      }
      this.sparkleParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  /**
   * Updates state at specific time (used by both 60fps preview and 4K exporter)
   */
  updateAtTime(time: number): void {
    if (!this.run) return;

    let targetCamY = 0;
    let targetCamX = 0;

    // Update Each Marble Position, Rotation, and Squash
    for (let l = 0; l < this.run.lanes.length; l++) {
      const lane = this.run.lanes[l];
      const marble = this.marbleMeshes[l];
      if (!marble || lane.points.length === 0) continue;

      // Find closest trajectory point for this time
      // Guaranteed 240Hz points array
      const ptIdx = Math.min(
        lane.points.length - 1,
        Math.max(0, Math.floor(time * 240))
      );
      const pt = lane.points[ptIdx];

      marble.position.set(pt.x, pt.y, pt.z);
      marble.rotation.set(pt.rotX, pt.rotY, pt.rotZ);

      // Squash and stretch on impact
      if (pt.state === 'hit') {
        marble.scale.set(1.25, 0.75, 1.25);
        this.triggerObjectHit(pt.hitObjectId || '', { x: pt.x, y: pt.y, z: pt.z }, lane.marbleColor);
      } else {
        // Recover smoothly to 1.0
        marble.scale.lerp(new THREE.Vector3(1, 1, 1), 0.2);
      }

      // Camera tracks primary melody marble (lane 0)
      if (l === 0) {
        targetCamY = pt.y - 0.6; // Lead slightly downward so next note is visible ahead
        targetCamX = pt.x * 0.4;
      }
    }

    // Critically Damped Follow Camera (zero jitter)
    const dt = 1 / 60;
    const springStrength = 18.0;
    const damping = 7.0;

    const forceY = (targetCamY - this.currentCamY) * springStrength - this.camVelY * damping;
    this.camVelY += forceY * dt;
    this.currentCamY += this.camVelY * dt;

    const forceX = (targetCamX - this.currentCamX) * springStrength - this.camVelX * damping;
    this.camVelX += forceX * dt;
    this.currentCamX += this.camVelX * dt;

    // Camera Styles
    const camStyle = this.run.config.cameraStyle || 'top_down_follow';
    if (camStyle === 'tilted_follow') {
      this.camera.position.set(this.currentCamX, this.currentCamY + 2.5, 6.5);
      this.camera.lookAt(this.currentCamX, this.currentCamY - 0.5, 0);
    } else if (camStyle === 'orbit_follow') {
      const orbitAngle = time * 0.35;
      const orbitRadius = 6.8;
      this.camera.position.set(
        this.currentCamX + Math.sin(orbitAngle) * 1.5,
        this.currentCamY + 1.2,
        orbitRadius
      );
      this.camera.lookAt(this.currentCamX, this.currentCamY, 0);
    } else if (camStyle === 'macro_close') {
      this.camera.position.set(this.currentCamX, this.currentCamY + 0.5, 4.2);
      this.camera.lookAt(this.currentCamX, this.currentCamY, 0);
    } else {
      // Default: top-down follow looking down from slightly above
      this.camera.position.set(this.currentCamX, this.currentCamY + 1.8, 7.2);
      this.camera.lookAt(this.currentCamX, this.currentCamY - 0.4, 0);
    }

    // Key Light follows camera vertically to keep shadow angles consistent down the wall
    this.keyLight.position.set(3, this.currentCamY + 7, 7);
    this.keyLight.target.position.set(0, this.currentCamY, 0);
    this.keyLight.target.updateMatrixWorld();

    // Finale Camera Pull-Back: at finale downbeat, smoothly pull back for triumphant reveal
    const finaleTime = this.run.duration - 2.0;
    if (time >= finaleTime) {
      const finaleProgress = Math.min(1.0, (time - finaleTime) / 2.0);
      this.camera.position.z += finaleProgress * 3.5;
    }

    // Update Object Wobbles & Pulse rings
    this.objectWobbles.forEach((wobble, id) => {
      const mesh = this.objectMeshes.get(id);
      if (mesh) {
        mesh.rotation.x += wobble.intensity * 0.08 * (Math.random() - 0.5);
        mesh.rotation.y += wobble.intensity * 0.08 * (Math.random() - 0.5);
        wobble.intensity *= wobble.decay;
        if (wobble.intensity < 0.01) {
          this.objectWobbles.delete(id);
        }

        const hitPulse = mesh.getObjectByName('hitPulse') as THREE.Mesh;
        if (hitPulse && hitPulse.material) {
          const mat = hitPulse.material as THREE.MeshBasicMaterial;
          mat.opacity = Math.max(0, mat.opacity - 0.04);
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
          this.particleVelocities[idx + 1] -= 9.8 * dt * 0.5; // gravity
        }
      }
      this.sparkleParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  /**
   * Synchronously renders a frame at specific time for 4K video export
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

      // Blit to target canvas context if separate context supplied
      if (targetCtx && targetCanvas !== this.renderer.domElement) {
        targetCtx.drawImage(this.renderer.domElement, 0, 0);
      }
    }
  }

  /**
   * Starts real-time 60fps animation loop
   */
  startPreview(onTimeUpdate?: (time: number) => void): void {
    if (this.isPreviewRunning) return;
    this.isPreviewRunning = true;
    this.startTime = performance.now();

    const loop = (now: number) => {
      if (!this.isPreviewRunning) return;
      const elapsed = (now - this.startTime) / 1000;

      // Loop or stop at duration
      const totalDur = this.run?.duration || 56;
      const loopTime = elapsed % totalDur;

      this.updateAtTime(loopTime);

      if (this.renderer && this.canvas) {
        this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.render(this.scene, this.camera);
      }

      if (onTimeUpdate) {
        onTimeUpdate(loopTime);
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  /**
   * Stops real-time animation loop
   */
  stopPreview(): void {
    this.isPreviewRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  dispose(): void {
    this.stopPreview();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    this.scene.clear();
  }
}
