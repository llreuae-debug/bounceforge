import * as THREE from 'three';
import { HeroMaterial, HeroMarble, WallBackground } from './types';

/**
 * Procedural Texture Generator
 * Generates seamless high-resolution procedural textures on 256x256 canvases
 * completely self-contained with zero external images or CDN dependencies.
 */
class ProceduralTextureFactory {
  private static cache: Map<string, THREE.CanvasTexture> = new Map();

  static getTexture(type: string): THREE.CanvasTexture {
    if (this.cache.has(type)) return this.cache.get(type)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      const tex = new THREE.CanvasTexture(canvas);
      this.cache.set(type, tex);
      return tex;
    }

    switch (type) {
      case 'kintsugi_gold': {
        // Glossy porcelain with intricate gold cracks
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        let cx = 30, cy = 20;
        ctx.moveTo(cx, cy);
        for (let i = 0; i < 9; i++) {
          cx += (Math.sin(i * 1.7) * 45) + 20;
          cy += (Math.cos(i * 2.3) * 35) + 25;
          ctx.lineTo(cx, cy);
        }
        ctx.stroke();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        break;
      }

      case 'marble_veins': {
        // Polished stone with soft grey & gold veins
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.lineWidth = 4;
        for (let j = 0; j < 4; j++) {
          ctx.beginPath();
          ctx.moveTo(0, j * 70);
          ctx.bezierCurveTo(90, j * 70 + 40, 160, j * 70 - 30, 256, j * 70 + 50);
          ctx.stroke();
        }
        break;
      }

      case 'candy_stripes': {
        // Red and white peppermint diagonal swirl stripes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#f43f5e';
        for (let i = -256; i < 512; i += 40) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i + 40, 0);
          ctx.lineTo(i + 256 + 40, 256);
          ctx.lineTo(i + 256, 256);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }

      case 'wood_grain': {
        // Fine polished oak grain
        ctx.fillStyle = '#d97706';
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#b45309';
        for (let y = 0; y < 256; y += 4) {
          ctx.fillRect(0, y, 256, 1.5 + Math.sin(y * 0.15) * 1.2);
        }
        break;
      }

      case 'ice_cracks': {
        // Crystal frost cracks with high contrast
        ctx.fillStyle = 'rgba(240, 249, 255, 0.9)';
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(40, 10);
        ctx.lineTo(120, 110);
        ctx.lineTo(90, 180);
        ctx.lineTo(190, 250);
        ctx.moveTo(120, 110);
        ctx.lineTo(210, 80);
        ctx.stroke();
        break;
      }

      case 'rainbow_dispersion': {
        // Spectral rainbow gradient for caustics & dispersion
        const grad = ctx.createLinearGradient(0, 0, 256, 0);
        grad.addColorStop(0.0, '#ef4444');
        grad.addColorStop(0.17, '#f97316');
        grad.addColorStop(0.33, '#eab308');
        grad.addColorStop(0.5, '#22c55e');
        grad.addColorStop(0.67, '#06b6d4');
        grad.addColorStop(0.83, '#3b82f6');
        grad.addColorStop(1.0, '#a855f7');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);
        break;
      }

      case 'hex_honeycomb': {
        // Honeycomb hex grid for bumblebee chaos
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        const r = 24;
        const h = r * Math.sqrt(3);
        for (let row = 0; row < 10; row++) {
          for (let col = 0; col < 10; col++) {
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
        break;
      }

      case 'neon_grid': {
        // Synthwave perspective magenta-cyan grid
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.5;
        for (let x = 0; x <= 256; x += 32) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 256);
          ctx.stroke();
        }
        ctx.strokeStyle = '#ec4899';
        for (let y = 0; y <= 256; y += 32) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(256, y);
          ctx.stroke();
        }
        break;
      }

      default: {
        // Soft plaster noise texture
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, 256, 256);
        const imgData = ctx.getImageData(0, 0, 256, 256);
        for (let i = 0; i < imgData.data.length; i += 4) {
          const noise = (Math.random() - 0.5) * 12;
          imgData.data[i] += noise;
          imgData.data[i + 1] += noise;
          imgData.data[i + 2] += noise;
        }
        ctx.putImageData(imgData, 0, 0);
        break;
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
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

      case 'swirl_glass':
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
   * Creates rich 3D Wall Surface Material matching the world
   */
  static getWallMaterial(wallType: string, baseHex: number): THREE.Material {
    const key = `wall_${wallType}_${baseHex}`;
    if (this.materialCache.has(key)) return this.materialCache.get(key)!;

    let mat: THREE.Material;
    switch (wallType) {
      case 'matte_plaster':
      case 'peach_plaster':
      case 'pastel_peach': {
        const tex = ProceduralTextureFactory.getTexture('plaster');
        mat = new THREE.MeshStandardMaterial({
          color: baseHex,
          bumpMap: tex,
          bumpScale: 0.035,
          roughness: 0.88,
          metalness: 0.02,
        });
        break;
      }

      case 'navy_velvet':
      case 'burgundy_velvet':
      case 'red_velvet':
      case 'soft_fabric': {
        mat = new THREE.MeshStandardMaterial({
          color: baseHex,
          roughness: 0.92,
          metalness: 0.0,
        });
        break;
      }

      case 'basalt_cave':
      case 'dark_basalt_cave': {
        mat = new THREE.MeshStandardMaterial({
          color: 0x18181b,
          roughness: 0.95,
          bumpScale: 0.08,
        });
        break;
      }

      case 'mint_tiles': {
        mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#a7f3d0'),
          roughness: 0.15,
          metalness: 0.05,
        });
        break;
      }

      case 'honeycomb_hex': {
        const hexTex = ProceduralTextureFactory.getTexture('hex_honeycomb');
        mat = new THREE.MeshStandardMaterial({
          map: hexTex,
          roughness: 0.4,
          metalness: 0.05,
        });
        break;
      }

      case 'light_wood':
      case 'oak_wood': {
        const woodTex = ProceduralTextureFactory.getTexture('wood_grain');
        mat = new THREE.MeshStandardMaterial({
          map: woodTex,
          roughness: 0.35,
          metalness: 0.02,
        });
        break;
      }

      case 'neon_grid': {
        const gridTex = ProceduralTextureFactory.getTexture('neon_grid');
        mat = new THREE.MeshStandardMaterial({
          map: gridTex,
          roughness: 0.2,
          metalness: 0.2,
          emissive: new THREE.Color('#082f49'),
          emissiveIntensity: 0.35,
        });
        break;
      }

      case 'marble_stone': {
        const mTex = ProceduralTextureFactory.getTexture('marble_veins');
        mat = new THREE.MeshStandardMaterial({
          color: 0xf8fafc,
          map: mTex,
          roughness: 0.25,
          metalness: 0.05,
        });
        break;
      }

      default: {
        mat = new THREE.MeshStandardMaterial({
          color: baseHex,
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
