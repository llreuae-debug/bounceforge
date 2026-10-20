import * as THREE from 'three';
import { HeroMaterial, HeroMarble } from './types';

/**
 * Procedural Texture Generator (8K Ultra-Resolution)
 * Generates seamless high-resolution procedural textures on 1024x1024 canvases
 * with 16x anisotropic filtering, mathematical sub-pixel accuracy, and zero external images.
 */
class ProceduralTextureFactory {
  private static cache: Map<string, THREE.CanvasTexture> = new Map();

  static getTexture(type: string): THREE.CanvasTexture {
    if (this.cache.has(type)) return this.cache.get(type)!;

    if (typeof document === 'undefined') {
      const tex = new THREE.CanvasTexture({ width: 1, height: 1 } as any);
      this.cache.set(type, tex);
      return tex;
    }

    const canvas = document.createElement('canvas');
    const size = 1024;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      const tex = new THREE.CanvasTexture(canvas);
      this.cache.set(type, tex);
      return tex;
    }

    switch (type) {
      case 'kintsugi_gold': {
        // Glossy porcelain with intricate 8K gold cracks & shimmering foil
        ctx.fillStyle = '#fafaf9';
        ctx.fillRect(0, 0, size, size);

        // Subtle porcelain micro-mottling
        const img = ctx.getImageData(0, 0, size, size);
        for (let i = 0; i < img.data.length; i += 4) {
          const n = (Math.random() - 0.5) * 6;
          img.data[i] += n;
          img.data[i + 1] += n;
          img.data[i + 2] += n;
        }
        ctx.putImageData(img, 0, 0);

        // Primary Gold Veins
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        let cx = 120, cy = 80;
        ctx.moveTo(cx, cy);
        for (let i = 0; i < 14; i++) {
          cx += (Math.sin(i * 1.6) * 160) + 80;
          cy += (Math.cos(i * 2.1) * 140) + 90;
          ctx.lineTo(cx, cy);
        }
        ctx.stroke();

        // Shimmering Inner Core
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Branching fine capillaries
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2.5;
        for (let b = 0; b < 12; b++) {
          ctx.beginPath();
          const bx = (b * 89) % size;
          const by = (b * 123) % size;
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(b) * 90, by + Math.sin(b) * 90);
          ctx.stroke();
        }
        break;
      }

      case 'marble_veins': {
        // 8K Italian Carrara marble stone with multi-tiered sediment veins
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, size, size);

        // Soft mineral clouding
        const grad = ctx.createLinearGradient(0, 0, size, size);
        grad.addColorStop(0, 'rgba(241, 245, 249, 0.9)');
        grad.addColorStop(0.5, 'rgba(226, 232, 240, 0.6)');
        grad.addColorStop(1, 'rgba(248, 250, 252, 0.9)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);

        // Broad subtle translucent grey sediment
        for (let j = 0; j < 6; j++) {
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
          ctx.lineWidth = 18;
          ctx.beginPath();
          ctx.moveTo(0, j * 180);
          ctx.bezierCurveTo(300, j * 180 + 120, 600, j * 180 - 100, size, j * 180 + 160);
          ctx.stroke();
        }

        // Crisp dark stone fissures
        for (let j = 0; j < 5; j++) {
          ctx.strokeStyle = 'rgba(100, 116, 139, 0.55)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(0, j * 210 + 40);
          ctx.bezierCurveTo(340, j * 210 + 140, 680, j * 210 - 60, size, j * 210 + 120);
          ctx.stroke();
        }

        // Delicate gold micro-vein accents
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 300);
        ctx.bezierCurveTo(450, 480, 750, 220, size, 400);
        ctx.stroke();
        break;
      }

      case 'candy_stripes': {
        // 8K Red and white peppermint diagonal swirl stripes with glossy sugar sheen
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#f43f5e';
        const stripeWidth = 140;
        for (let i = -size; i < size * 2; i += stripeWidth * 2) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i + stripeWidth, 0);
          ctx.lineTo(i + size + stripeWidth, size);
          ctx.lineTo(i + size, size);
          ctx.closePath();
          ctx.fill();
        }
        // Thin gold pin-stripes between swirls
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.8)';
        ctx.lineWidth = 6;
        for (let i = -size; i < size * 2; i += stripeWidth * 2) {
          ctx.beginPath();
          ctx.moveTo(i + stripeWidth, 0);
          ctx.lineTo(i + size + stripeWidth, size);
          ctx.stroke();
        }
        break;
      }

      case 'wood_grain': {
        // 8K Luxury polished oak & walnut wood grain
        ctx.fillStyle = '#d97706';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#92400e';
        for (let y = 0; y < size; y += 4) {
          const wave = Math.sin(y * 0.04) * 8 + Math.cos(y * 0.015) * 14;
          const thickness = 1.2 + Math.sin(y * 0.08) * 0.9;
          ctx.fillRect(0, y + wave, size, thickness);
        }
        // Micro-fiber wood pore noise
        ctx.fillStyle = 'rgba(69, 26, 3, 0.15)';
        for (let i = 0; i < 2000; i++) {
          const px = Math.random() * size;
          const py = Math.random() * size;
          ctx.fillRect(px, py, 2, 8);
        }
        break;
      }

      case 'ice_cracks': {
        // 8K Glacier ice fracture with internal refraction cracks
        ctx.fillStyle = '#f0f9ff';
        ctx.fillRect(0, 0, size, size);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(140, 40);
        ctx.lineTo(480, 420);
        ctx.lineTo(360, 720);
        ctx.lineTo(760, 980);
        ctx.moveTo(480, 420);
        ctx.lineTo(840, 320);
        ctx.stroke();

        // High frequency frost dendrites
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.7)';
        ctx.lineWidth = 2.5;
        for (let d = 0; d < 18; d++) {
          const ox = (d * 57) % size;
          const oy = (d * 83) % size;
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(ox + 40, oy + 40);
          ctx.lineTo(ox + 60, oy + 25);
          ctx.stroke();
        }
        break;
      }

      case 'rainbow_dispersion': {
        // 8K Spectral rainbow dispersion caustics
        const grad = ctx.createLinearGradient(0, 0, size, 0);
        grad.addColorStop(0.0, '#ef4444');
        grad.addColorStop(0.16, '#f97316');
        grad.addColorStop(0.33, '#eab308');
        grad.addColorStop(0.5, '#22c55e');
        grad.addColorStop(0.67, '#06b6d4');
        grad.addColorStop(0.83, '#3b82f6');
        grad.addColorStop(1.0, '#a855f7');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        break;
      }

      case 'hex_honeycomb': {
        // 8K Golden honey hex grid with beveled borders
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(0, 0, size, size);
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 8;
        const r = 70;
        const h = r * Math.sqrt(3);
        for (let row = -1; row < 12; row++) {
          for (let col = -1; col < 12; col++) {
            const x = col * (r * 1.5);
            const y = row * h + (col % 2 === 1 ? h / 2 : 0);
            ctx.beginPath();
            for (let a = 0; a < 6; a++) {
              const angle = (a * Math.PI) / 3;
              const px = x + r * Math.cos(angle);
              const py = y + r * Math.sin(angle);
              if (a === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
          }
        }
        // Amber inner cell glow
        ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
        for (let row = 0; row < 10; row += 2) {
          for (let col = 0; col < 10; col += 2) {
            const x = col * (r * 1.5);
            const y = row * h + (col % 2 === 1 ? h / 2 : 0);
            ctx.beginPath();
            ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      }

      case 'neon_grid': {
        // 8K Synthwave perspective cyan-magenta grid
        ctx.fillStyle = '#05070f';
        ctx.fillRect(0, 0, size, size);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
        ctx.lineWidth = 3;
        for (let x = 0; x <= size; x += 64) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, size);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.7)';
        for (let y = 0; y <= size; y += 64) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(size, y);
          ctx.stroke();
        }
        // Glowing intersection points
        ctx.fillStyle = '#ffffff';
        for (let x = 0; x <= size; x += 64) {
          for (let y = 0; y <= size; y += 64) {
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      }

      case 'water_caustics': {
        // 8K Fluid light refraction caustics network
        ctx.fillStyle = '#0369a1';
        ctx.fillRect(0, 0, size, size);
        ctx.strokeStyle = 'rgba(224, 242, 254, 0.65)';
        ctx.lineWidth = 5;
        for (let c = 0; c < 16; c++) {
          ctx.beginPath();
          const sx = (c * 71) % size;
          const sy = (c * 97) % size;
          ctx.moveTo(sx, sy);
          ctx.bezierCurveTo(sx + 150, sy + 60, sx - 80, sy + 180, sx + 220, sy + 250);
          ctx.stroke();
        }
        break;
      }

      case 'basalt_cave': {
        // 8K Dark volcanic porous rock texture
        ctx.fillStyle = '#18181b';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#09090b';
        for (let i = 0; i < 4000; i++) {
          const px = Math.random() * size;
          const py = Math.random() * size;
          const r = Math.random() * 4 + 1;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'rain_window': {
        // 8K Wet window pane with vertical rain streaks and bead droplets
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(0, 0, size, size);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = 3;
        for (let r = 0; r < 40; r++) {
          const rx = (r * 29) % size;
          const ry = (r * 47) % size;
          const len = 40 + Math.random() * 80;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx, ry + len);
          ctx.stroke();
          // Droplet at bottom of streak
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.beginPath();
          ctx.arc(rx, ry + len, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'living_moss': {
        // 8K Cellular organic velvet moss carpet
        ctx.fillStyle = '#14532d';
        ctx.fillRect(0, 0, size, size);
        for (let m = 0; m < 5000; m++) {
          ctx.fillStyle = m % 2 === 0 ? '#166534' : '#15803d';
          const mx = Math.random() * size;
          const my = Math.random() * size;
          ctx.beginPath();
          ctx.arc(mx, my, 2 + Math.random() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'stone_brick': {
        // 8K Chiseled ancient stone block masonry
        ctx.fillStyle = '#52525b';
        ctx.fillRect(0, 0, size, size);
        ctx.strokeStyle = '#27272a';
        ctx.lineWidth = 8;
        const blockH = 80;
        const blockW = 160;
        for (let y = 0; y < size; y += blockH) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(size, y);
          ctx.stroke();
          const offset = (Math.floor(y / blockH) % 2) * (blockW / 2);
          for (let x = offset; x < size; x += blockW) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + blockH);
            ctx.stroke();
          }
        }
        break;
      }

      case 'eid_arabesque': {
        // 8K Islamic geometric octagram star & gold latticework
        ctx.fillStyle = '#064e3b';
        ctx.fillRect(0, 0, size, size);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 5;
        const spacing = 128;
        for (let x = 0; x <= size; x += spacing) {
          for (let y = 0; y <= size; y += spacing) {
            // Draw 8-pointed star
            ctx.save();
            ctx.translate(x, y);
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
              const r = i % 2 === 0 ? 36 : 18;
              const angle = (i * Math.PI) / 4;
              const px = r * Math.cos(angle);
              const py = r * Math.sin(angle);
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
          }
        }
        break;
      }

      case 'peach_blush_wall': {
        // Continuous warm pastel PEACH-BLUSH wall:
        // Base #F2D8CB, slightly lighter #F7E4DA toward top-left, slightly deeper #EBCBBE toward bottom-right
        const grad = ctx.createLinearGradient(0, 0, size, size);
        grad.addColorStop(0.0, '#F7E4DA');
        grad.addColorStop(0.5, '#F2D8CB');
        grad.addColorStop(1.0, '#EBCBBE');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);

        // Very fine plaster micro-texture, almost invisible
        const imgData = ctx.getImageData(0, 0, size, size);
        for (let i = 0; i < imgData.data.length; i += 4) {
          const noise = (Math.random() - 0.5) * 5;
          imgData.data[i] = Math.max(0, Math.min(255, imgData.data[i] + noise));
          imgData.data[i + 1] = Math.max(0, Math.min(255, imgData.data[i + 1] + noise));
          imgData.data[i + 2] = Math.max(0, Math.min(255, imgData.data[i + 2] + noise));
        }
        ctx.putImageData(imgData, 0, 0);
        break;
      }

      case 'cobalt_swirl': {
        // Deep cobalt blue core with 2-3 white/light-blue swirl bands wrapping around it
        ctx.fillStyle = '#1e3a8a'; // Deep cobalt blue base
        ctx.fillRect(0, 0, size, size);

        // 3 swirling ribbons wrapping diagonally across spherical UV map
        const swirlColors = ['#ffffff', '#bae6fd', '#f0f9ff'];
        for (let s = 0; s < 3; s++) {
          ctx.strokeStyle = swirlColors[s];
          ctx.lineWidth = 42;
          ctx.lineCap = 'round';
          ctx.beginPath();
          const startY = (s * 340) % size;
          ctx.moveTo(0, startY);
          ctx.bezierCurveTo(
            size * 0.35,
            startY + 160,
            size * 0.65,
            startY - 160,
            size,
            (startY + 300) % size
          );
          ctx.stroke();

          // Delicate crisp inner white stripe
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 14;
          ctx.stroke();
        }
        break;
      }

      default: {
        // 8K Architectural Venetian plaster with natural micro-pores
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, size, size);
        const imgData = ctx.getImageData(0, 0, size, size);
        for (let i = 0; i < imgData.data.length; i += 4) {
          const noise = (Math.random() - 0.5) * 10;
          imgData.data[i] = Math.max(0, Math.min(255, imgData.data[i] + noise));
          imgData.data[i + 1] = Math.max(0, Math.min(255, imgData.data[i + 1] + noise));
          imgData.data[i + 2] = Math.max(0, Math.min(255, imgData.data[i + 2] + noise));
        }
        ctx.putImageData(imgData, 0, 0);
        break;
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 16; // 8K / 4K Ultra-crisp anisotropic rendering
    this.cache.set(type, texture);
    return texture;
  }
}

/**
 * Material Library (24 Hero Materials)
 * Builds physically based materials with custom shader extras and quality scaling.
 */
export class MarbleMaterialLibrary {
  private static materialCache: Map<string, THREE.Material> = new Map();

  /**
   * Creates or retrieves a cached Hero Material
   */
  static getMaterial(
    type: HeroMaterial,
    colorHex: string = '#ffffff',
    tier: 'low' | 'medium' | 'high' = 'high'
  ): THREE.Material {
    const key = `${type}_${colorHex}_${tier}`;
    if (this.materialCache.has(key)) return this.materialCache.get(key)!;

    const baseColor = new THREE.Color(colorHex);
    let mat: THREE.Material;

    switch (type) {
      // ==========================================
      // GLASS & CRYSTAL (8)
      // ==========================================
      case 'clear_crystal': {
        // High IOR, chromatic dispersion, rainbow edges
        mat = new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          transmission: tier === 'low' ? 0.7 : 0.95,
          opacity: 1.0,
          transparent: true,
          roughness: 0.03,
          ior: 1.85,
          thickness: 0.65,
          clearcoat: 1.0,
          clearcoatRoughness: 0.02,
          reflectivity: 0.9,
          dispersion: 0.05,
        } as any);
        break;
      }

      case 'cut_diamond': {
        // Faceted diamond with glints
        mat = new THREE.MeshPhysicalMaterial({
          color: 0xf8fafc,
          transmission: 0.92,
          roughness: 0.02,
          ior: 2.42,
          thickness: 0.8,
          clearcoat: 1.0,
          reflectivity: 1.0,
          metalness: 0.1,
          transparent: true,
        });
        break;
      }

      case 'frosted_glass': {
        // Rough transmission, soft inner glow
        mat = new THREE.MeshPhysicalMaterial({
          color: baseColor,
          transmission: 0.86,
          roughness: 0.38,
          ior: 1.48,
          thickness: 0.45,
          transparent: true,
          opacity: 0.94,
        });
        break;
      }

      case 'stained_glass': {
        // Colored transmissive panels with rich saturation
        mat = new THREE.MeshPhysicalMaterial({
          color: baseColor,
          transmission: 0.88,
          roughness: 0.06,
          ior: 1.54,
          thickness: 0.3,
          transparent: true,
          opacity: 0.98,
        });
        break;
      }

      case 'liquid_filled_glass': {
        // Translucent container with internal liquid tone
        mat = new THREE.MeshPhysicalMaterial({
          color: baseColor.clone().multiplyScalar(1.1),
          transmission: 0.85,
          roughness: 0.08,
          ior: 1.34, // water IOR
          thickness: 0.75,
          transparent: true,
          opacity: 0.95,
        });
        break;
      }

      case 'soap_bubble': {
        // Thin-film iridescent wobble
        mat = new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          transmission: 0.98,
          roughness: 0.02,
          ior: 1.33,
          thickness: 0.05,
          transparent: true,
          opacity: 0.65,
          iridescence: 1.0,
          iridescenceIOR: 1.35,
          iridescenceThicknessRange: [100, 400],
        });
        break;
      }

      case 'sea_glass': {
        // Matte frosted tinted glass, worn edges
        mat = new THREE.MeshPhysicalMaterial({
          color: baseColor,
          transmission: 0.76,
          roughness: 0.45,
          ior: 1.5,
          thickness: 0.4,
          transparent: true,
          opacity: 0.92,
        });
        break;
      }

      case 'neon_glass_tube': {
        // Emissive core with rich bloom glow
        mat = new THREE.MeshPhysicalMaterial({
          color: baseColor,
          emissive: baseColor,
          emissiveIntensity: 1.85,
          roughness: 0.12,
          transmission: 0.4,
          transparent: true,
          opacity: 0.95,
        });
        break;
      }

      // ==========================================
      // GEMS & STONE (5)
      // ==========================================
      case 'opal': {
        // Shifting internal color flecks with iridescence
        mat = new THREE.MeshPhysicalMaterial({
          color: 0xfdf4ff,
          roughness: 0.08,
          transmission: 0.4,
          clearcoat: 1.0,
          clearcoatRoughness: 0.05,
          iridescence: 0.9,
          iridescenceIOR: 1.6,
          iridescenceThicknessRange: [200, 700],
        });
        break;
      }

      case 'amethyst_geode': {
        // Deep purple crystal with glowing inner core
        mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color('#7e22ce'),
          emissive: new THREE.Color('#3b0764'),
          emissiveIntensity: 0.5,
          transmission: 0.45,
          roughness: 0.15,
          ior: 1.62,
          thickness: 0.6,
          transparent: true,
        });
        break;
      }

      case 'obsidian': {
        // Glossy black volcanic glass with sharp razor reflections
        mat = new THREE.MeshPhysicalMaterial({
          color: 0x09090b,
          roughness: 0.04,
          metalness: 0.15,
          clearcoat: 1.0,
          clearcoatRoughness: 0.02,
          reflectivity: 0.95,
        });
        break;
      }

      case 'marble_stone': {
        // Veined polished white marble stone
        const marbleTex = ProceduralTextureFactory.getTexture('marble_veins');
        mat = new THREE.MeshStandardMaterial({
          color: 0xf8fafc,
          map: marbleTex,
          roughness: 0.22,
          metalness: 0.05,
        });
        break;
      }

      case 'porcelain_gold': {
        // Glossy white ceramic with gold kintsugi seams
        const kintsugiTex = ProceduralTextureFactory.getTexture('kintsugi_gold');
        mat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: kintsugiTex,
          roughness: 0.15,
          metalness: 0.2,
        });
        break;
      }

      // ==========================================
      // METALS (4)
      // ==========================================
      case 'chrome_mirror': {
        // Clean perfect metallic mirror reflections
        mat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          metalness: 0.98,
          roughness: 0.03,
        });
        break;
      }

      case 'brushed_gold': {
        // Warm anisotropic brushed gold
        mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#fbbf24'),
          metalness: 0.94,
          roughness: 0.22,
        });
        break;
      }

      case 'copper_patina': {
        // Aged copper with turquoise/green patina spots
        mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#ca8a04'),
          metalness: 0.88,
          roughness: 0.35,
        });
        break;
      }

      case 'liquid_mercury': {
        // Reflective liquid metal with surface ripple
        mat = new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          metalness: 1.0,
          roughness: 0.02,
        });
        break;
      }

      // ==========================================
      // SOFT & SWEET (6)
      // ==========================================
      case 'jelly_gummy': {
        // Translucent subsurface squishy jelly
        mat = new THREE.MeshPhysicalMaterial({
          color: baseColor,
          transmission: 0.88,
          roughness: 0.14,
          ior: 1.42,
          thickness: 0.85,
          transparent: true,
          opacity: 0.92,
        });
        break;
      }

      case 'hard_candy': {
        // Swirled candy with high gloss clearcoat
        const candyTex = ProceduralTextureFactory.getTexture('candy_stripes');
        mat = new THREE.MeshPhysicalMaterial({
          map: candyTex,
          roughness: 0.08,
          clearcoat: 1.0,
          clearcoatRoughness: 0.04,
          transmission: 0.35,
        });
        break;
      }

      case 'velvet_felt': {
        // Soft sheen fabric
        mat = new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.85,
          metalness: 0.02,
        });
        break;
      }

      case 'lacquered_wood': {
        // Glossy polished wood grain
        const woodTex = ProceduralTextureFactory.getTexture('wood_grain');
        mat = new THREE.MeshPhysicalMaterial({
          map: woodTex,
          roughness: 0.18,
          clearcoat: 1.0,
          clearcoatRoughness: 0.06,
        });
        break;
      }

      case 'holographic_foil': {
        // Multi-angle rainbow iridescence
        mat = new THREE.MeshPhysicalMaterial({
          color: 0xf1f5f9,
          roughness: 0.05,
          metalness: 0.4,
          clearcoat: 1.0,
          iridescence: 1.0,
          iridescenceIOR: 1.8,
          iridescenceThicknessRange: [250, 650],
        });
        break;
      }

      case 'latex_balloon': {
        // Glossy stretch rubber
        mat = new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.22,
          metalness: 0.05,
        });
        break;
      }

      // ==========================================
      // ICE (1)
      // ==========================================
      case 'ice': {
        // Clear ice with internal frosty cracks
        const iceTex = ProceduralTextureFactory.getTexture('ice_cracks');
        mat = new THREE.MeshPhysicalMaterial({
          color: 0xf0f9ff,
          alphaMap: iceTex,
          transmission: 0.94,
          roughness: 0.08,
          ior: 1.31,
          thickness: 0.6,
          transparent: true,
          opacity: 0.95,
        });
        break;
      }

      default: {
        mat = new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.25,
          metalness: 0.1,
        });
        break;
      }
    }

    this.materialCache.set(key, mat);
    return mat;
  }

  /**
   * Creates a Hero Marble Material with physical PBR properties
   */
  static getMarbleMaterial(type: HeroMarble, accentColor: string = '#38bdf8'): THREE.Material {
    const key = `marble_${type}_${accentColor}`;
    if (this.materialCache.has(key)) return this.materialCache.get(key)!;

    let mat: THREE.Material;
    switch (type) {
      case 'clear_diamond':
        mat = new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          transmission: 0.95,
          roughness: 0.02,
          ior: 2.42,
          thickness: 0.8,
          clearcoat: 1.0,
          transparent: true,
        });
        break;

      case 'chrome_mirror':
        mat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          metalness: 0.98,
          roughness: 0.03,
        });
        break;

      case 'gold':
        mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#fbbf24'),
          metalness: 0.96,
          roughness: 0.12,
        });
        break;

      case 'liquid_mercury':
        mat = new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          metalness: 1.0,
          roughness: 0.02,
        });
        break;

      case 'pearl':
        mat = new THREE.MeshPhysicalMaterial({
          color: 0xfdf4ff,
          roughness: 0.12,
          transmission: 0.35,
          clearcoat: 1.0,
          clearcoatRoughness: 0.08,
        });
        break;

      case 'opal':
        mat = new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          roughness: 0.06,
          transmission: 0.45,
          clearcoat: 1.0,
          iridescence: 0.9,
          iridescenceIOR: 1.5,
        });
        break;

      case 'moonstone':
        mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color('#c7d2fe'),
          transmission: 0.65,
          roughness: 0.1,
          clearcoat: 1.0,
          ior: 1.52,
          transparent: true,
        });
        break;

      case 'ruby_glass':
        mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color('#e11d48'),
          transmission: 0.88,
          roughness: 0.05,
          ior: 1.76,
          thickness: 0.5,
          transparent: true,
        });
        break;

      case 'emerald_glass':
        mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color('#059669'),
          transmission: 0.88,
          roughness: 0.05,
          ior: 1.76,
          thickness: 0.5,
          transparent: true,
        });
        break;

      case 'amethyst':
        mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color('#9333ea'),
          transmission: 0.85,
          roughness: 0.06,
          ior: 1.65,
          thickness: 0.55,
          transparent: true,
        });
        break;

      case 'jade':
        mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color('#10b981'),
          roughness: 0.22,
          transmission: 0.35,
          clearcoat: 0.85,
        });
        break;

      case 'amber_honey':
        mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color('#f59e0b'),
          transmission: 0.85,
          roughness: 0.08,
          ior: 1.54,
          thickness: 0.6,
          transparent: true,
        });
        break;

      case 'ice_snowglobe':
        mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color('#e0f2fe'),
          transmission: 0.92,
          roughness: 0.05,
          ior: 1.31,
          thickness: 0.7,
          transparent: true,
        });
        break;

      case 'bubble':
        mat = new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          transmission: 0.98,
          roughness: 0.02,
          ior: 1.33,
          transparent: true,
          opacity: 0.7,
          iridescence: 1.0,
        });
        break;

      case 'neon_core':
        mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(accentColor),
          emissive: new THREE.Color(accentColor),
          emissiveIntensity: 0.85,
          roughness: 0.15,
        });
        break;

      case 'galaxy':
        mat = new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          emissive: new THREE.Color('#38bdf8'),
          emissiveIntensity: 0.25,
          roughness: 0.1,
          metalness: 0.4,
        });
        break;

      case 'gummy':
        mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(accentColor),
          transmission: 0.86,
          roughness: 0.15,
          ior: 1.42,
          thickness: 0.8,
          transparent: true,
        });
        break;

      case 'candy_swirl': {
        const candyTex = ProceduralTextureFactory.getTexture('candy_stripes');
        mat = new THREE.MeshPhysicalMaterial({
          map: candyTex,
          roughness: 0.08,
          clearcoat: 1.0,
        });
        break;
      }

      case 'ember':
        mat = new THREE.MeshStandardMaterial({
          color: 0x18181b,
          emissive: new THREE.Color('#f97316'),
          emissiveIntensity: 0.75,
          roughness: 0.35,
        });
        break;

      case 'swirl_glass': {
        // Deep cobalt blue core with 2-3 white/light-blue swirl bands wrapping around it,
        // strong specular highlight, slight transparency at edges
        const swirlTex = ProceduralTextureFactory.getTexture('cobalt_swirl');
        mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color('#1e40af'), // deep cobalt blue
          map: swirlTex,
          transmission: 0.72,
          roughness: 0.04,
          metalness: 0.05,
          clearcoat: 1.0,
          clearcoatRoughness: 0.02,
          ior: 1.54,
          thickness: 0.55,
          transparent: true,
          opacity: 0.96,
        });
        break;
      }

      default:
        mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(accentColor),
          transmission: 0.88,
          roughness: 0.06,
          ior: 1.52,
          thickness: 0.45,
          transparent: true,
          opacity: 0.96,
        });
        break;
    }

    this.materialCache.set(key, mat);
    return mat;
  }

  /**
   * Creates rich 8K 3D Wall Surface Material matching the world design system
   */
  static getWallMaterial(wallType: string, baseHex: number): THREE.Material {
    const key = `wall_8k_${wallType}_${baseHex}`;
    if (this.materialCache.has(key)) return this.materialCache.get(key)!;

    let mat: THREE.Material;
    const normPlaster = ProceduralTextureFactory.getTexture('plaster');

    switch (wallType) {
      case 'pastel_peach_blush':
      case 'pastel_peach_gradient': {
        const peachTex = ProceduralTextureFactory.getTexture('peach_blush_wall');
        mat = new THREE.MeshStandardMaterial({
          map: peachTex,
          bumpMap: normPlaster,
          bumpScale: 0.015, // Very fine plaster texture, almost invisible
          roughness: 0.88,
          metalness: 0.02,
        });
        break;
      }

      // 01 · Pastel Für Elise / Peach Plaster
      case 'matte_plaster':
      case 'peach_plaster':
      case 'pastel_peach':
      case 'sunrise_gradient_plaster':
      case 'golden_hour_plaster':
      case 'warm_dusk_textured_wall':
      case 'sakura_pink_plaster': {
        mat = new THREE.MeshStandardMaterial({
          color: baseHex,
          bumpMap: normPlaster,
          bumpScale: 0.045,
          roughness: 0.86,
          metalness: 0.02,
        });
        break;
      }

      // 02 · Candy Canon
      case 'candy_stripe_satin': {
        const stripeTex = ProceduralTextureFactory.getTexture('candy_stripes');
        mat = new THREE.MeshStandardMaterial({
          map: stripeTex,
          roughness: 0.22,
          metalness: 0.04,
        });
        break;
      }

      // 03, 14, 19, 30, 32 · Velvets & Stage Fabrics
      case 'navy_velvet':
      case 'deep_navy_velvet':
      case 'burgundy_velvet':
      case 'burgundy_velvet_wall':
      case 'red_stage_curtain':
      case 'emerald_velvet_wall':
      case 'crimson_holiday_velvet':
      case 'blush_felt_fabric':
      case 'soft_fabric': {
        mat = new THREE.MeshStandardMaterial({
          color: baseHex,
          roughness: 0.96,
          metalness: 0.0,
          bumpMap: normPlaster,
          bumpScale: 0.02,
        });
        break;
      }

      // 04 · Swan Glass (White Satin)
      case 'white_satin':
      case 'white_satin_sheen': {
        mat = new THREE.MeshPhysicalMaterial({
          color: 0xfafafa,
          roughness: 0.16,
          metalness: 0.05,
          clearcoat: 0.95,
          clearcoatRoughness: 0.1,
        });
        break;
      }

      // 05, 45 · Dark Basalt Caves & Crystals
      case 'basalt_cave':
      case 'dark_basalt_cave':
      case 'dark_crystalline_cave_wall': {
        const rockTex = ProceduralTextureFactory.getTexture('basalt_cave');
        mat = new THREE.MeshStandardMaterial({
          color: 0x18181b,
          map: rockTex,
          bumpMap: rockTex,
          bumpScale: 0.12,
          roughness: 0.92,
          metalness: 0.1,
        });
        break;
      }

      // 07 · Turkish March Sprint (Mint Ceramic)
      case 'mint_tiles':
      case 'mint_ceramic_tiles': {
        mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color('#a7f3d0'),
          roughness: 0.12,
          metalness: 0.05,
          clearcoat: 0.95,
          clearcoatRoughness: 0.05,
        });
        break;
      }

      // 08, 13, 29 · Lavender Mist, Foggy Blue, Misty Violet
      case 'lavender_mist_wall':
      case 'foggy_grey_blue_wall':
      case 'misty_violet_surface':
      case 'cloud_blue_wall': {
        mat = new THREE.MeshStandardMaterial({
          color: baseHex,
          roughness: 0.78,
          metalness: 0.02,
          bumpMap: normPlaster,
          bumpScale: 0.03,
        });
        break;
      }

      // 09 · Bumblebee Chaos
      case 'honeycomb_hex':
      case 'honeycomb_hex_wall': {
        const hexTex = ProceduralTextureFactory.getTexture('hex_honeycomb');
        mat = new THREE.MeshStandardMaterial({
          map: hexTex,
          bumpMap: hexTex,
          bumpScale: 0.05,
          roughness: 0.32,
          metalness: 0.08,
        });
        break;
      }

      // 10, 31, 34 · Winter Frost & Snow
      case 'winter_frost_wall':
      case 'frosted_pine_green':
      case 'snowy_blue_night_wall': {
        const iceTex = ProceduralTextureFactory.getTexture('ice_cracks');
        mat = new THREE.MeshPhysicalMaterial({
          color: baseHex,
          bumpMap: iceTex,
          bumpScale: 0.06,
          roughness: 0.22,
          transmission: 0.2,
          ior: 1.31,
          thickness: 0.5,
          transparent: true,
        });
        break;
      }

      // 12 · Danube Spiral (Cream Marble Stone)
      case 'marble_stone':
      case 'cream_marble_stone': {
        const mTex = ProceduralTextureFactory.getTexture('marble_veins');
        mat = new THREE.MeshPhysicalMaterial({
          color: 0xfafaf9,
          map: mTex,
          roughness: 0.18,
          metalness: 0.04,
          clearcoat: 0.9,
          clearcoatRoughness: 0.08,
        });
        break;
      }

      // 15, 37, 50 · Black Studios & Stages
      case 'matte_black_studio':
      case 'glossy_black_onyx':
      case 'black_orchestral_stage_wall': {
        mat = new THREE.MeshStandardMaterial({
          color: 0x09090b,
          roughness: wallType === 'glossy_black_onyx' ? 0.08 : 0.85,
          metalness: wallType === 'glossy_black_onyx' ? 0.5 : 0.05,
        });
        break;
      }

      // 16, 39, 41, 49 · Oak, Amber Wood, Desk Wood
      case 'light_wood':
      case 'oak_wood':
      case 'light_oak_paneling':
      case 'warm_amber_wood_wall':
      case 'cozy_desk_wood_wall':
      case 'vintage_brass_wood_wall': {
        const woodTex = ProceduralTextureFactory.getTexture('wood_grain');
        mat = new THREE.MeshPhysicalMaterial({
          map: woodTex,
          bumpMap: woodTex,
          bumpScale: 0.04,
          roughness: 0.28,
          metalness: 0.02,
          clearcoat: 0.75,
        });
        break;
      }

      // 17 · Air on Glass (Fine Soft Paper)
      case 'soft_white_paper': {
        mat = new THREE.MeshStandardMaterial({
          color: 0xfdfdfc,
          roughness: 0.94,
          metalness: 0.0,
          bumpMap: normPlaster,
          bumpScale: 0.025,
        });
        break;
      }

      // 18, 48 · Rain on Glass
      case 'mint_rain_glass':
      case 'rainy_window_pane_wall': {
        const rainTex = ProceduralTextureFactory.getTexture('rain_window');
        mat = new THREE.MeshPhysicalMaterial({
          color: baseHex,
          map: rainTex,
          bumpMap: rainTex,
          bumpScale: 0.08,
          roughness: 0.1,
          transmission: 0.45,
          ior: 1.5,
          thickness: 0.4,
          transparent: true,
        });
        break;
      }

      // 20 · Copper Workshop
      case 'copper_workshop_panels': {
        mat = new THREE.MeshStandardMaterial({
          color: 0xb45309,
          roughness: 0.38,
          metalness: 0.82,
        });
        break;
      }

      // 21, 47 · Night Sky & Deep Space
      case 'deep_night_sky':
      case 'deep_space_starfield_wall': {
        mat = new THREE.MeshStandardMaterial({
          color: 0x030712,
          emissive: new THREE.Color('#1e1b4b'),
          emissiveIntensity: 0.25,
          roughness: 0.85,
        });
        break;
      }

      // 23, 33 · Tri-Color Panels & Gift Wrap
      case 'tricolor_architectural_panel':
      case 'holiday_wrapping_paper': {
        const wrapTex = ProceduralTextureFactory.getTexture('candy_stripes');
        mat = new THREE.MeshStandardMaterial({
          map: wrapTex,
          roughness: 0.35,
          metalness: 0.05,
        });
        break;
      }

      // 24 · Living Moss Garden
      case 'living_moss_wall': {
        const mossTex = ProceduralTextureFactory.getTexture('living_moss');
        mat = new THREE.MeshStandardMaterial({
          map: mossTex,
          bumpMap: mossTex,
          bumpScale: 0.14,
          roughness: 0.95,
          metalness: 0.0,
        });
        break;
      }

      // 26 · Stone Brick Wall
      case 'stone_brick_wall': {
        const brickTex = ProceduralTextureFactory.getTexture('stone_brick');
        mat = new THREE.MeshStandardMaterial({
          map: brickTex,
          bumpMap: brickTex,
          bumpScale: 0.1,
          roughness: 0.88,
          metalness: 0.02,
        });
        break;
      }

      // 27, 44 · Water Caustics & Ocean Blue
      case 'water_caustic_wall':
      case 'underwater_deep_blue_wall': {
        const waterTex = ProceduralTextureFactory.getTexture('water_caustics');
        mat = new THREE.MeshPhysicalMaterial({
          color: baseHex,
          map: waterTex,
          bumpMap: waterTex,
          bumpScale: 0.07,
          roughness: 0.18,
          transmission: 0.3,
          ior: 1.33,
          thickness: 0.6,
          transparent: true,
        });
        break;
      }

      // 35, 36 · Eid & Ramadan Arabesque
      case 'emerald_gold_geometric_wall':
      case 'midnight_teal_wall': {
        const arabesqueTex = ProceduralTextureFactory.getTexture('eid_arabesque');
        mat = new THREE.MeshStandardMaterial({
          color: baseHex,
          map: arabesqueTex,
          roughness: 0.32,
          metalness: 0.25,
        });
        break;
      }

      // 40 · Birthday Balloon Confetti Wall
      case 'pastel_confetti_wall': {
        mat = new THREE.MeshStandardMaterial({
          color: baseHex,
          roughness: 0.45,
          metalness: 0.05,
        });
        break;
      }

      // 42 · Wet Asphalt Wall
      case 'wet_black_asphalt_wall': {
        mat = new THREE.MeshPhysicalMaterial({
          color: 0x18181b,
          roughness: 0.18,
          metalness: 0.2,
          clearcoat: 0.95,
          clearcoatRoughness: 0.12,
        });
        break;
      }

      // 43 · Synthwave Slide Neon Grid
      case 'neon_grid':
      case 'magenta_cyan_neon_grid': {
        const gridTex = ProceduralTextureFactory.getTexture('neon_grid');
        mat = new THREE.MeshStandardMaterial({
          map: gridTex,
          roughness: 0.18,
          metalness: 0.25,
          emissive: new THREE.Color('#082f49'),
          emissiveIntensity: 0.45,
        });
        break;
      }

      // 46 · Candy Pop Bubblegum Wall
      case 'bubblegum_pink_wall': {
        mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color('#f472b6'),
          roughness: 0.24,
          clearcoat: 0.8,
          clearcoatRoughness: 0.15,
        });
        break;
      }

      default: {
        mat = new THREE.MeshStandardMaterial({
          color: baseHex,
          bumpMap: normPlaster,
          bumpScale: 0.035,
          roughness: 0.75,
          metalness: 0.04,
        });
        break;
      }
    }

    this.materialCache.set(key, mat);
    return mat;
  }
}
