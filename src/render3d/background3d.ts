import * as THREE from 'three';

export class BackgroundSimulator3D {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private rings: THREE.Mesh[] = [];
  private ball: THREE.Mesh;
  private dustParticles: THREE.Points;
  private animId: number | null = null;
  private lastTime: number = performance.now();
  private pointer = { x: 0, y: 0 };
  private scrollProgress = 0;
  private isPaused = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = null; // transparent so page dark styling shows through

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 50);
    this.camera.position.set(0, 0, 8);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: 'low-power',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0) * 0.6); // 0.6x for lightweight performance
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Ambient & Rim Lights
    const amb = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(amb);
    const point = new THREE.PointLight(0x00f0ff, 2.0, 15);
    point.position.set(0, 0, 4);
    this.scene.add(point);

    // 6-8 Neon Torus Rings rotating on different axes
    const ringColors = ['#00f0ff', '#a855f7', '#ff007f', '#ffd600', '#00ff88', '#38bdf8', '#ff7a00'];
    for (let i = 0; i < 7; i++) {
      const radius = 1.8 + i * 0.45;
      const geo = new THREE.TorusGeometry(radius, 0.04, 16, 48);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(ringColors[i]),
        transparent: true,
        opacity: 0.75,
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = i * 0.4;
      ring.rotation.y = i * 0.6;
      this.scene.add(ring);
      this.rings.push(ring);
    }

    // Glowing Bouncing Ball
    const bGeo = new THREE.SphereGeometry(0.25, 24, 24);
    const bMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    this.ball = new THREE.Mesh(bGeo, bMat);
    this.scene.add(this.ball);

    // Floating Dust Particles with depth
    const dustCount = 180;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
      dustPos[i] = (Math.random() - 0.5) * 16;
      dustPos[i + 1] = (Math.random() - 0.5) * 16;
      dustPos[i + 2] = (Math.random() - 0.5) * 12;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.04,
      transparent: true,
      opacity: 0.4,
    });
    this.dustParticles = new THREE.Points(dustGeo, dustMat);
    this.scene.add(this.dustParticles);

    // Event Listeners
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('scroll', this.onScroll);
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    this.startLoop();
  }

  private onPointerMove = (e: PointerEvent) => {
    this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  };

  private onScroll = () => {
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    this.scrollProgress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  };

  private onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private onVisibilityChange = () => {
    this.isPaused = document.hidden;
  };

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
  }

  private startLoop(): void {
    // Check prefers-reduced-motion
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const loop = (now: number) => {
      this.animId = requestAnimationFrame(loop);
      // Cap at 30 FPS to save GPU
      if (now - this.lastTime < 32 || this.isPaused) return;
      this.lastTime = now;

      const t = now * 0.001;

      // Rotate rings on varying 3D axes
      for (let i = 0; i < this.rings.length; i++) {
        const ring = this.rings[i];
        ring.rotation.x += 0.006 * (i % 2 === 0 ? 1 : -1);
        ring.rotation.y += 0.009 * (i % 3 === 0 ? 1 : -1);
        ring.rotation.z += 0.004;
      }

      // Ball orbital harmonic bounce
      this.ball.position.x = Math.sin(t * 1.8) * 1.5;
      this.ball.position.y = Math.cos(t * 2.3) * 1.5;
      this.ball.position.z = Math.sin(t * 1.2) * 1.2;

      // Parallax camera tilt toward pointer & scroll dolly
      const targetCamX = this.pointer.x * 0.8;
      const targetCamY = this.pointer.y * 0.8;
      const targetCamZ = 8.0 - this.scrollProgress * 4.5; // dollies through rings on scroll!

      this.camera.position.x += (targetCamX - this.camera.position.x) * 0.05;
      this.camera.position.y += (targetCamY - this.camera.position.y) * 0.05;
      this.camera.position.z += (targetCamZ - this.camera.position.z) * 0.05;
      this.camera.lookAt(0, 0, 0);

      this.renderer.render(this.scene, this.camera);
    };

    this.animId = requestAnimationFrame(loop);
  }

  public destroy(): void {
    if (this.animId) cancelAnimationFrame(this.animId);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.renderer.dispose();
  }
}
