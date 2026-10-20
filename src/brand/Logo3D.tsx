import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export interface Logo3DProps {
  autoplay?: boolean;
  loop?: boolean;
  soundEnabled?: boolean;
  width?: number | string;
  height?: number | string;
  className?: string;
  onLoopComplete?: () => void;
}

export const Logo3D: React.FC<Logo3DProps> = ({
  autoplay = true,
  soundEnabled = false,
  width = '100%',
  height = 420,
  className = '',
  onLoopComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [soundOn, setSoundOn] = useState(soundEnabled);

  // Synthesize gentle procedural ASMR ping
  const playSound = (type: 'ping1' | 'ping2' | 'escape' | 'pop') => {
    if (!soundOn) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'ping1') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.42);
      } else if (type === 'ping2') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now); // A5
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.52);
      } else if (type === 'escape') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.25);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.62);
      } else if (type === 'pop') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.09);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
      }
    } catch {
      // Audio autoplay policy catch
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth || 600;
    const h = container.clientHeight || 420;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050507);
    scene.fog = new THREE.FogExp2(0x050507, 0.04);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 1.2, 7.8);
    camera.lookAt(0, 0.2, 0);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const keyLight = new THREE.PointLight(0xccff00, 3.5, 15);
    keyLight.position.set(3, 4, 4);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0xff2e93, 3.0, 15);
    fillLight.position.set(-3, -2, 3);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x00f0ff, 2.5, 12);
    rimLight.position.set(0, 5, -2);
    scene.add(rimLight);

    // 4. Reflective Floor
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x07070b,
      roughness: 0.15,
      metalness: 0.85,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.2;
    scene.add(floor);

    // Subtle floor grid
    const gridHelper = new THREE.GridHelper(24, 24, 0x141424, 0x090912);
    gridHelper.position.y = -2.19;
    scene.add(gridHelper);

    // 5. Build 3D Symbol: The Escape Ring (Concept A)
    const logoGroup = new THREE.Group();
    scene.add(logoGroup);

    // Ring with top-right gap (~40 degrees opening)
    // Major radius = 1.35, tube radius = 0.16. Arc is ~5.6 rad.
    const ringArc = (320 * Math.PI) / 180;
    const ringGeo = new THREE.TorusGeometry(1.35, 0.16, 24, 96, ringArc);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xccff00,
      emissive: 0xccff00,
      emissiveIntensity: 1.6,
      roughness: 0.2,
      metalness: 0.1,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    // Align gap to top-right (around 45 degrees)
    ringMesh.rotation.z = (110 * Math.PI) / 180;
    ringMesh.position.set(-2.0, 0.2, 0);
    logoGroup.add(ringMesh);

    // Ring endcaps (spheres at ends of arc)
    const capGeo = new THREE.SphereGeometry(0.16, 16, 16);
    const cap1 = new THREE.Mesh(capGeo, ringMat);
    const cap2 = new THREE.Mesh(capGeo, ringMat);
    cap1.position.set(1.35 * Math.cos(0), 1.35 * Math.sin(0), 0);
    cap2.position.set(1.35 * Math.cos(ringArc), 1.35 * Math.sin(ringArc), 0);
    ringMesh.add(cap1);
    ringMesh.add(cap2);

    // 6. Glowing Ball (Hot Pink)
    const ballGroup = new THREE.Group();
    logoGroup.add(ballGroup);

    const ballCoreGeo = new THREE.SphereGeometry(0.38, 32, 32);
    const ballCoreMat = new THREE.MeshStandardMaterial({
      color: 0xff2e93,
      emissive: 0xff2e93,
      emissiveIntensity: 2.2,
      roughness: 0.1,
      metalness: 0.3,
    });
    const ballCore = new THREE.Mesh(ballCoreGeo, ballCoreMat);
    ballGroup.add(ballCore);

    // Outer glass/clearcoat shell
    const ballShellGeo = new THREE.SphereGeometry(0.44, 32, 32);
    const ballShellMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.85,
      opacity: 1,
      transparent: true,
      roughness: 0.05,
      ior: 1.5,
      thickness: 0.4,
    });
    const ballShell = new THREE.Mesh(ballShellGeo, ballShellMat);
    ballGroup.add(ballShell);

    // 7. Motion Streaks behind Ball
    const streakGroup = new THREE.Group();
    ballGroup.add(streakGroup);

    for (let i = 0; i < 3; i++) {
      const streakGeo = new THREE.CylinderGeometry(0.04 - i * 0.01, 0.01, 0.9 - i * 0.15, 12);
      const streakMat = new THREE.MeshStandardMaterial({
        color: i === 2 ? 0x00f0ff : 0xff2e93,
        emissive: i === 2 ? 0x00f0ff : 0xff2e93,
        emissiveIntensity: 1.8,
        transparent: true,
        opacity: 0.8 - i * 0.2,
      });
      const streak = new THREE.Mesh(streakGeo, streakMat);
      streak.position.set(-0.35 - i * 0.12, -0.35 - i * 0.12, 0);
      streak.rotation.z = Math.PI / 4;
      streakGroup.add(streak);
    }

    // 8. 3D Wordmark ("bounceforge") + 3D "3D" Badge
    // Create high-res dynamic canvas texture for wordmark
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 1024;
    textCanvas.height = 256;
    const ctx = textCanvas.getContext('2d')!;

    const updateWordmarkTexture = (opacity = 1.0, tracking = 0) => {
      ctx.clearRect(0, 0, 1024, 256);
      ctx.fillStyle = `rgba(245, 245, 240, ${opacity})`;
      ctx.font = '900 114px "Helvetica Neue", Helvetica, Arial, sans-serif';
      ctx.letterSpacing = '-0.05em';
      ctx.textBaseline = 'middle';
      ctx.fillText('bounceforge', 20 + tracking, 128);
    };
    updateWordmarkTexture(1.0);

    const wordmarkTex = new THREE.CanvasTexture(textCanvas);
    wordmarkTex.minFilter = THREE.LinearFilter;
    wordmarkTex.magFilter = THREE.LinearFilter;

    const wordmarkGeo = new THREE.PlaneGeometry(3.6, 0.9);
    const wordmarkMat = new THREE.MeshStandardMaterial({
      map: wordmarkTex,
      transparent: true,
      roughness: 0.3,
      metalness: 0.2,
    });
    const wordmarkMesh = new THREE.Mesh(wordmarkGeo, wordmarkMat);
    wordmarkMesh.position.set(1.4, 0.2, 0);
    logoGroup.add(wordmarkMesh);

    // 3D "3D" Badge Mesh: Extruded rounded pill
    const badgeGroup = new THREE.Group();
    badgeGroup.position.set(3.4, 0.45, 0.05);
    logoGroup.add(badgeGroup);

    // Pill background
    const pillGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.58, 24);
    pillGeo.rotateZ(Math.PI / 2);
    const pillMat = new THREE.MeshStandardMaterial({
      color: 0xccff00,
      emissive: 0xccff00,
      emissiveIntensity: 1.4,
      roughness: 0.2,
      metalness: 0.1,
    });
    const pillMesh = new THREE.Mesh(pillGeo, pillMat);
    badgeGroup.add(pillMesh);

    // "3D" badge text texture
    const badgeCanvas = document.createElement('canvas');
    badgeCanvas.width = 256;
    badgeCanvas.height = 128;
    const bCtx = badgeCanvas.getContext('2d')!;
    bCtx.clearRect(0, 0, 256, 128);
    bCtx.fillStyle = '#050507';
    bCtx.font = 'italic 900 78px "Helvetica Neue", Helvetica, Arial, sans-serif';
    bCtx.textAlign = 'center';
    bCtx.textBaseline = 'middle';
    bCtx.fillText('3D', 128, 66);

    const badgeTex = new THREE.CanvasTexture(badgeCanvas);
    const badgeTextGeo = new THREE.PlaneGeometry(0.52, 0.26);
    const badgeTextMat = new THREE.MeshBasicMaterial({
      map: badgeTex,
      transparent: true,
    });
    const badgeTextMesh = new THREE.Mesh(badgeTextGeo, badgeTextMat);
    badgeTextMesh.position.set(0, 0, 0.13);
    badgeGroup.add(badgeTextMesh);

    // 9. Interactive Parallax
    let targetRotY = 0;
    let targetRotX = 0;
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotY = nx * 0.25;
      targetRotX = -ny * 0.18;
    };
    container.addEventListener('mousemove', onMouseMove);

    // 10. 2.5s Loopable Animation Engine
    // Total duration: 2.50s (150 frames @ 60fps)
    // 0.0s - 0.4s: Ball drops in, bounce 1 at y=-0.5
    // 0.4s - 0.8s: Bounce 2 at apex, ring forms around it
    // 0.8s - 1.3s: Ball launches through top-right gap with energy flash
    // 1.3s - 1.9s: Wordmark slides in
    // 1.9s - 2.2s: 3D badge pops with scale 1.0 -> 1.25 -> 1.0
    // 2.2s - 2.5s: Hold & loop transition
    let animTime = 0;
    let lastFrame = performance.now();
    let ping1Played = false;
    let ping2Played = false;
    let escapePlayed = false;
    let popPlayed = false;

    const animate = () => {
      const now = performance.now();
      const dt = Math.min((now - lastFrame) / 1000, 0.1);
      lastFrame = now;

      animTime += dt;
      if (animTime > 2.5) {
        animTime = 0;
        ping1Played = false;
        ping2Played = false;
        escapePlayed = false;
        popPlayed = false;
        onLoopComplete?.();
      }

      const t = animTime;

      // Stage 1: Ball drops and bounces
      if (t < 0.35) {
        // Drop into ring center
        const dropNorm = t / 0.35;
        const ballY = 2.0 - 2.0 * Math.sin(dropNorm * Math.PI * 0.5);
        ballGroup.position.set(-2.0, 0.2 + ballY, 0);
        ballGroup.scale.set(1, 1, 1);
        streakGroup.visible = false;
        ringMesh.scale.set(0.1, 0.1, 0.1);
        wordmarkMesh.position.x = 2.4;
        wordmarkMat.opacity = 0;
        badgeGroup.scale.set(0, 0, 0);
      } else if (t < 0.75) {
        // Bounce 1 & ring expansion
        if (!ping1Played) {
          playSound('ping1');
          ping1Played = true;
        }
        const bNorm = (t - 0.35) / 0.4;
        const ringScale = Math.min(1.0, bNorm * 1.4);
        ringMesh.scale.set(ringScale, ringScale, ringScale);

        // Small secondary bounce
        const bounceH = Math.sin(bNorm * Math.PI) * 0.6;
        ballGroup.position.set(-2.0, 0.2 + bounceH, 0);
        streakGroup.visible = false;
      } else if (t < 1.3) {
        // Bounce 2 & ESCAPE!
        if (!ping2Played && t >= 0.75) {
          playSound('ping2');
          ping2Played = true;
        }
        if (!escapePlayed && t >= 0.88) {
          playSound('escape');
          escapePlayed = true;
        }

        const escNorm = (t - 0.75) / 0.55;
        // Burst out through top-right gap: along vector (1, 1) from (-2.0, 0.2)
        const burstDist = escNorm * escNorm * 2.2;
        const ballX = -2.0 + 1.25 * burstDist;
        const ballY = 0.2 + 0.95 * burstDist;

        ballGroup.position.set(ballX, ballY, 0.1);
        streakGroup.visible = true;
        streakGroup.scale.setScalar(Math.min(1.3, escNorm * 1.6));

        // Wordmark begins sliding in
        const wmNorm = Math.max(0, (t - 1.0) / 0.3);
        wordmarkMesh.position.x = 2.2 - wmNorm * 0.8;
        wordmarkMat.opacity = wmNorm;
      } else if (t < 1.9) {
        // Ball settles at official symbol escape position (-0.85, 1.1)
        ballGroup.position.set(-0.85, 1.05, 0.05);
        streakGroup.visible = true;
        streakGroup.scale.set(1, 1, 1);

        wordmarkMesh.position.x = 1.4;
        wordmarkMat.opacity = 1.0;

        // Badge pops
        if (!popPlayed && t >= 1.65) {
          playSound('pop');
          popPlayed = true;
        }
        const bNorm = Math.max(0, (t - 1.6) / 0.3);
        const bScale = bNorm < 0.6 ? 1.0 + bNorm * 0.4 : 1.24 - (bNorm - 0.6) * 0.6;
        badgeGroup.scale.set(bScale, bScale, bScale);
      } else {
        // Hold complete logo lockup
        ballGroup.position.set(-0.85, 1.05, 0.05);
        streakGroup.visible = true;
        ringMesh.scale.set(1, 1, 1);
        wordmarkMesh.position.x = 1.4;
        wordmarkMat.opacity = 1.0;
        badgeGroup.scale.set(1, 1, 1);
      }

      // Parallax smooth interpolation
      logoGroup.rotation.y += (targetRotY - logoGroup.rotation.y) * 0.08;
      logoGroup.rotation.x += (targetRotX - logoGroup.rotation.x) * 0.08;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    const animId = requestAnimationFrame(animate);

    // Resize handler
    const onResize = () => {
      if (!container) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      ballCoreGeo.dispose();
      ballCoreMat.dispose();
      ballShellGeo.dispose();
      ballShellMat.dispose();
      wordmarkGeo.dispose();
      wordmarkMat.dispose();
      wordmarkTex.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [soundOn, onLoopComplete]);

  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        background: '#050507',
        borderRadius: 16,
      }}
      className={`bf-logo3d-wrapper select-none border border-neutral-800/80 shadow-2xl ${className}`}
    >
      {/* Audio & Control overlays */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <button
          onClick={() => setSoundOn(!soundOn)}
          className="px-3 py-1 text-xs font-black tracking-wider uppercase rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border border-neutral-700/60 backdrop-blur transition-colors"
          title="Toggle 3D procedural audio"
        >
          {soundOn ? '🔊 Sound ON' : '🔇 ASMR Sound'}
        </button>
      </div>
      <div className="absolute bottom-3 left-4 z-10 text-[10px] font-mono tracking-widest text-neutral-500 uppercase pointer-events-none">
        3D Interactive Intro • Concept A "The Escape"
      </div>
    </div>
  );
};
export default Logo3D;
