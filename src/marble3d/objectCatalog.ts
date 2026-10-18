import * as THREE from 'three';
import { TunedObjectType, TunedObjectInstance, DecorInstance, EmbossedHandleInstance } from './types';

export class ObjectCatalog3D {
  // Shared geometry cache to avoid duplicate allocations
  private static geoCache: Map<string, THREE.BufferGeometry> = new Map();
  // Shared materials cache
  private static matCache: Map<string, THREE.Material> = new Map();

  /**
   * Builds a complete Three.js procedural 3D object for a tuned wall note
   */
  static createTunedObjectMesh(inst: TunedObjectInstance): THREE.Group {
    const group = new THREE.Group();
    group.name = `tuned_${inst.id}`;
    group.position.set(inst.x, inst.y, inst.z);
    group.rotation.set(inst.rotationX, inst.rotationY, inst.rotationZ);

    // 1. Mounting Pin / Bracket (Wall Mount)
    const pinGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.25, 12);
    pinGeo.rotateX(Math.PI / 2);
    const pinMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.2,
    });
    const pinMesh = new THREE.Mesh(pinGeo, pinMat);
    pinMesh.position.set(0, 0, -0.12);
    pinMesh.castShadow = true;
    group.add(pinMesh);

    // 2. Instrument Specific Geometry & Material
    switch (inst.type) {
      case 'glass_tube': {
        const height = 0.8 * (inst.scaleY || 1.0);
        const tubeGeo = new THREE.CylinderGeometry(0.08, 0.08, height, 24);
        const tubeMat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(inst.color),
          transmission: 0.88,
          opacity: 1.0,
          transparent: true,
          roughness: 0.12,
          ior: 1.52,
          thickness: 0.4,
          metalness: 0.05,
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        tubeMesh.castShadow = true;
        tubeMesh.receiveShadow = true;
        group.add(tubeMesh);

        // Metal suspension caps
        const capGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.04, 16);
        const capMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.8, roughness: 0.3 });
        const topCap = new THREE.Mesh(capGeo, capMat);
        topCap.position.y = height / 2;
        group.add(topCap);
        break;
      }

      case 'metal_tack': {
        const discGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.04, 32);
        discGeo.rotateX(Math.PI / 2);
        const discMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(inst.color),
          metalness: 0.95,
          roughness: 0.15,
        });
        const discMesh = new THREE.Mesh(discGeo, discMat);
        discMesh.castShadow = true;
        group.add(discMesh);

        // Center button tack
        const centerGeo = new THREE.SphereGeometry(0.05, 16, 16);
        const centerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9, roughness: 0.1 });
        const centerMesh = new THREE.Mesh(centerGeo, centerMat);
        centerMesh.position.z = 0.03;
        group.add(centerMesh);
        break;
      }

      case 'rainbow_xylophone': {
        // Curved half-pipe bar
        const width = 0.45;
        const length = 0.18;
        const barGeo = new THREE.BoxGeometry(width, 0.05, length);
        const barMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(inst.color),
          roughness: 0.25,
          metalness: 0.4,
        });
        const barMesh = new THREE.Mesh(barGeo, barMat);
        barMesh.castShadow = true;
        group.add(barMesh);

        // Mounting felt grommets
        const feltGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.06, 8);
        const feltMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
        const felt1 = new THREE.Mesh(feltGeo, feltMat);
        felt1.position.set(-0.16, 0, 0);
        const felt2 = new THREE.Mesh(feltGeo, feltMat);
        felt2.position.set(0.16, 0, 0);
        group.add(felt1, felt2);
        break;
      }

      case 'drum': {
        const radius = 0.28;
        const shellGeo = new THREE.CylinderGeometry(radius, radius, 0.18, 24);
        const shellMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(inst.color),
          roughness: 0.35,
          metalness: 0.2,
        });
        const shellMesh = new THREE.Mesh(shellGeo, shellMat);
        shellMesh.rotation.x = Math.PI / 2;
        shellMesh.castShadow = true;
        group.add(shellMesh);

        // Translucent Drumhead Skin
        const headGeo = new THREE.CircleGeometry(radius * 0.95, 24);
        const headMat = new THREE.MeshStandardMaterial({
          color: 0xfffbeb,
          roughness: 0.6,
          metalness: 0.05,
        });
        const headMesh = new THREE.Mesh(headGeo, headMat);
        headMesh.position.z = 0.091;
        headMesh.receiveShadow = true;
        group.add(headMesh);

        // Chrome rim
        const rimGeo = new THREE.TorusGeometry(radius, 0.02, 12, 32);
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.15 });
        const rimMesh = new THREE.Mesh(rimGeo, rimMat);
        rimMesh.position.z = 0.09;
        group.add(rimMesh);
        break;
      }

      case 'dark_tube': {
        const height = 0.75 * (inst.scaleY || 1.0);
        const tubeGeo = new THREE.CylinderGeometry(0.1, 0.1, height, 20);
        const tubeMat = new THREE.MeshStandardMaterial({
          color: 0x18181b,
          roughness: 0.85,
          metalness: 0.1,
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        tubeMesh.castShadow = true;
        group.add(tubeMesh);

        // Gold rim accent
        const goldRimGeo = new THREE.TorusGeometry(0.102, 0.015, 8, 24);
        const goldRimMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.2 });
        const rim = new THREE.Mesh(goldRimGeo, goldRimMat);
        rim.position.y = height / 2;
        rim.rotation.x = Math.PI / 2;
        group.add(rim);
        break;
      }

      case 'wire_rail': {
        const railLength = 0.6;
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-railLength / 2, 0.1, 0),
          new THREE.Vector3(0, 0, 0.05),
          new THREE.Vector3(railLength / 2, -0.1, 0),
        ]);
        const railGeo = new THREE.TubeGeometry(curve, 20, 0.02, 8, false);
        const railMat = new THREE.MeshStandardMaterial({
          color: 0x94a3b8,
          metalness: 0.85,
          roughness: 0.25,
        });
        const railMesh = new THREE.Mesh(railGeo, railMat);
        railMesh.castShadow = true;
        group.add(railMesh);
        break;
      }

      case 'crystal_glass': {
        // Stemware Glass
        const bowlGeo = new THREE.CylinderGeometry(0.16, 0.08, 0.35, 20);
        const glassMat = new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          transmission: 0.92,
          transparent: true,
          opacity: 1.0,
          roughness: 0.08,
          ior: 1.5,
          thickness: 0.2,
        });
        const bowlMesh = new THREE.Mesh(bowlGeo, glassMat);
        bowlMesh.castShadow = true;
        group.add(bowlMesh);

        // Colored water inside representing pitch level
        const waterHeight = Math.min(0.28, 0.1 + inst.pitchRatio * 0.08);
        const waterGeo = new THREE.CylinderGeometry(0.14, 0.09, waterHeight, 16);
        const waterMat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(inst.color),
          transmission: 0.7,
          transparent: true,
          opacity: 0.85,
          roughness: 0.1,
        });
        const waterMesh = new THREE.Mesh(waterGeo, waterMat);
        waterMesh.position.y = -0.16 + waterHeight / 2;
        group.add(waterMesh);
        break;
      }

      case 'kalimba_tine':
      default: {
        // Polished metal tine on wooden block
        const blockGeo = new THREE.BoxGeometry(0.35, 0.1, 0.12);
        const blockMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6, metalness: 0.1 });
        const block = new THREE.Mesh(blockGeo, blockMat);
        block.castShadow = true;
        group.add(block);

        const tineGeo = new THREE.BoxGeometry(0.04, 0.38, 0.015);
        const tineMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 });
        const tine = new THREE.Mesh(tineGeo, tineMat);
        tine.position.set(0, -0.05, 0.07);
        tine.castShadow = true;
        group.add(tine);
        break;
      }
    }

    // Dynamic Hit Light Pulse (invisible until hit)
    const hitPulseGeo = new THREE.RingGeometry(0.05, 0.35, 24);
    const hitPulseMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(inst.color),
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
    });
    const hitPulseMesh = new THREE.Mesh(hitPulseGeo, hitPulseMat);
    hitPulseMesh.name = 'hitPulse';
    hitPulseMesh.position.z = 0.02;
    group.add(hitPulseMesh);

    return group;
  }

  /**
   * Builds the Finale Catcher (cup / funnel / cushion)
   */
  static createCatcherMesh(type: string): THREE.Group {
    const group = new THREE.Group();
    group.name = 'final_catcher';

    // Pastel Glass Cup Catcher
    const cupGeo = new THREE.CylinderGeometry(0.7, 0.45, 0.8, 32, 1, true);
    const cupMat = new THREE.MeshPhysicalMaterial({
      color: 0xfbcfe8,
      transmission: 0.85,
      transparent: true,
      roughness: 0.1,
      ior: 1.52,
      thickness: 0.5,
    });
    const cupMesh = new THREE.Mesh(cupGeo, cupMat);
    cupMesh.castShadow = true;
    cupMesh.receiveShadow = true;
    group.add(cupMesh);

    // Soft velvet inner cushion
    const cushionGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.15, 24);
    const cushionMat = new THREE.MeshStandardMaterial({
      color: 0xec4899,
      roughness: 0.8,
      metalness: 0.05,
    });
    const cushion = new THREE.Mesh(cushionGeo, cushionMat);
    cushion.position.y = -0.3;
    group.add(cushion);

    // Golden support base
    const baseGeo = new THREE.CylinderGeometry(0.6, 0.7, 0.12, 32);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.2 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.45;
    base.castShadow = true;
    group.add(base);

    return group;
  }

  /**
   * Builds 100% Original Procedural Decor Props (no external copyrighted models)
   */
  static createDecorMesh(decor: DecorInstance): THREE.Group {
    const group = new THREE.Group();
    group.name = `decor_${decor.id}`;
    group.position.set(decor.x, decor.y, decor.z);
    group.rotation.set(decor.rotationX, decor.rotationY, decor.rotationZ);
    group.scale.setScalar(decor.scale);

    switch (decor.type) {
      case 'mascot_dome': {
        // ORIGINAL BounceForge mascot figurine in clear glass cloche dome
        // Wooden Base
        const baseGeo = new THREE.CylinderGeometry(0.24, 0.26, 0.05, 24);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.5 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.castShadow = true;
        group.add(base);

        // Mascot Head (Cute pastel orb with smiling visor)
        const headGeo = new THREE.SphereGeometry(0.12, 20, 20);
        const headMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 0.14;
        group.add(head);

        // Glowing Visor Eyes
        const visorGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.03, 16);
        visorGeo.rotateX(Math.PI / 2);
        const visorMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 0.15, 0.09);
        group.add(visor);

        // Glass Cloche Dome
        const domeGeo = new THREE.SphereGeometry(0.22, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMat = new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          transmission: 0.9,
          transparent: true,
          roughness: 0.08,
          ior: 1.5,
        });
        const dome = new THREE.Mesh(domeGeo, domeMat);
        dome.position.y = 0.03;
        group.add(dome);
        break;
      }

      case 'potted_plant': {
        // Terracotta pot
        const potGeo = new THREE.CylinderGeometry(0.16, 0.11, 0.2, 16);
        const potMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
        const pot = new THREE.Mesh(potGeo, potMat);
        pot.castShadow = true;
        group.add(pot);

        // Succulent leaves
        const leafGeo = new THREE.SphereGeometry(0.08, 12, 12);
        leafGeo.scale(1, 0.4, 1.8);
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.4 });
        for (let l = 0; l < 5; l++) {
          const leaf = new THREE.Mesh(leafGeo, leafMat);
          leaf.position.y = 0.12;
          leaf.rotation.y = (l * Math.PI * 2) / 5;
          leaf.rotation.x = 0.3;
          group.add(leaf);
        }
        break;
      }

      case 'planet_rings': {
        // Mini Toy Saturn Planet
        const planetGeo = new THREE.SphereGeometry(0.15, 20, 20);
        const planetMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.3 });
        const planet = new THREE.Mesh(planetGeo, planetMat);
        planet.castShadow = true;
        group.add(planet);

        const ringGeo = new THREE.RingGeometry(0.2, 0.32, 32);
        const ringMat = new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        });
        const rings = new THREE.Mesh(ringGeo, ringMat);
        rings.rotation.x = Math.PI / 2.8;
        group.add(rings);
        break;
      }

      case 'candy_lozenge':
      default: {
        // Glossy pastel candy
        const candyGeo = new THREE.SphereGeometry(0.14, 16, 16);
        candyGeo.scale(1.2, 0.6, 0.8);
        const candyMat = new THREE.MeshStandardMaterial({
          color: 0xf472b6,
          roughness: 0.1,
          metalness: 0.1,
        });
        const candy = new THREE.Mesh(candyGeo, candyMat);
        candy.castShadow = true;
        group.add(candy);
        break;
      }
    }

    return group;
  }

  /**
   * Builds Embossed 3D Handle text on the wall
   */
  static createEmbossedHandleMesh(handle: EmbossedHandleInstance): THREE.Group {
    const group = new THREE.Group();
    group.name = `handle_${handle.id}`;
    group.position.set(handle.x, handle.y, handle.z);

    // Canvas texture for ultra-crisp embossed typography with ambient occlusion shadow
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 512, 128);

    // Embossed shadow
    ctx.font = 'bold 38px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.fillText(handle.text, 256 + 2, 64 + 2);

    // Embossed highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillText(handle.text, 256 - 1, 64 - 1);

    // Main subtle text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillText(handle.text, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;

    const planeGeo = new THREE.PlaneGeometry(2.4, 0.6);
    const planeMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    group.add(plane);

    return group;
  }
}
