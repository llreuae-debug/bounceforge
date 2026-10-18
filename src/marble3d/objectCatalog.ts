import * as THREE from 'three';
import { TunedObjectType, TunedObjectInstance, DecorInstance, EmbossedHandleInstance } from './types';

export class ObjectCatalog3D {
  /**
   * Builds a complete Three.js procedural 3D object for a tuned wall note
   * with real physical thickness, visible inner walls, rims, beveled edges, and mounting brackets.
   */
  static createTunedObjectMesh(inst: TunedObjectInstance): THREE.Group {
    const group = new THREE.Group();
    group.name = `tuned_${inst.id}`;
    group.position.set(inst.x, inst.y, inst.z);
    group.rotation.set(inst.rotationX, inst.rotationY, inst.rotationZ);

    // 1. Visible Wall Pin & Mounting Bracket (Real 3D Wall Interface)
    const pinGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.28, 12);
    pinGeo.rotateX(Math.PI / 2);
    const pinMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.2,
    });
    const pinMesh = new THREE.Mesh(pinGeo, pinMat);
    pinMesh.position.set(0, 0, -0.14);
    pinMesh.castShadow = true;
    group.add(pinMesh);

    // Wall mounting rosette / bracket plate
    const bracketGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.015, 16);
    bracketGeo.rotateX(Math.PI / 2);
    const bracketMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.85,
      roughness: 0.3,
    });
    const bracketMesh = new THREE.Mesh(bracketGeo, bracketMat);
    bracketMesh.position.set(0, 0, -0.26);
    bracketMesh.castShadow = true;
    group.add(bracketMesh);

    // 2. Instrument Specific Geometry & Material with Real 3D Thickness
    switch (inst.type) {
      case 'glass_tube': {
        const height = 0.55 * (inst.scaleY || 1.0);
        const radius = 0.065;
        const tubeThickness = 0.012;

        // Outer Hollow Cylinder
        const outerTubeGeo = new THREE.CylinderGeometry(radius, radius, height, 24, 1, true);
        const glassMat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(inst.color),
          transmission: 0.88,
          opacity: 1.0,
          transparent: true,
          roughness: 0.1,
          ior: 1.52,
          thickness: 0.45,
          metalness: 0.05,
          side: THREE.DoubleSide,
        });
        const outerTube = new THREE.Mesh(outerTubeGeo, glassMat);
        outerTube.castShadow = true;
        outerTube.receiveShadow = true;
        group.add(outerTube);

        // Visible Inner Hollow Wall
        const innerTubeGeo = new THREE.CylinderGeometry(radius - tubeThickness, radius - tubeThickness, height * 0.98, 20, 1, true);
        const innerTube = new THREE.Mesh(innerTubeGeo, glassMat);
        group.add(innerTube);

        // Polished Glass Rims (Top & Bottom Torus)
        const rimGeo = new THREE.TorusGeometry(radius - tubeThickness / 2, tubeThickness / 2, 8, 24);
        rimGeo.rotateX(Math.PI / 2);
        const topRim = new THREE.Mesh(rimGeo, glassMat);
        topRim.position.y = height / 2;
        const bottomRim = new THREE.Mesh(rimGeo, glassMat);
        bottomRim.position.y = -height / 2;
        group.add(topRim, bottomRim);

        // Metal Mounting Collar
        const collarGeo = new THREE.CylinderGeometry(radius + 0.008, radius + 0.008, 0.035, 20);
        const collarMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.85, roughness: 0.25 });
        const collar = new THREE.Mesh(collarGeo, collarMat);
        collar.position.y = 0;
        collar.castShadow = true;
        group.add(collar);
        break;
      }

      case 'metal_tack': {
        // Domed Head with Beveled Edge
        const domeGeo = new THREE.SphereGeometry(0.18, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(inst.color),
          metalness: 0.95,
          roughness: 0.12,
        });
        const dome = new THREE.Mesh(domeGeo, domeMat);
        dome.position.z = 0.02;
        dome.castShadow = true;
        group.add(dome);

        // Beveled Base Ring
        const ringGeo = new THREE.CylinderGeometry(0.185, 0.17, 0.03, 24);
        ringGeo.rotateX(Math.PI / 2);
        const ringMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.2 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.z = 0.0;
        ring.castShadow = true;
        group.add(ring);
        break;
      }

      case 'rainbow_xylophone': {
        // Beveled curved bar with real thickness
        const width = 0.38;
        const barHeight = 0.045;
        const length = 0.16;
        const barGeo = new THREE.BoxGeometry(width, barHeight, length);
        const barMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(inst.color),
          roughness: 0.22,
          metalness: 0.45,
        });
        const barMesh = new THREE.Mesh(barGeo, barMat);
        barMesh.castShadow = true;
        group.add(barMesh);

        // Mounting felt grommets
        const feltGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.055, 8);
        const feltMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
        const felt1 = new THREE.Mesh(feltGeo, feltMat);
        felt1.position.set(-width * 0.35, 0, 0);
        const felt2 = new THREE.Mesh(feltGeo, feltMat);
        felt2.position.set(width * 0.35, 0, 0);
        group.add(felt1, felt2);
        break;
      }

      case 'drum': {
        // Drum with Rims, Translucent Skin, and Tuning Lugs
        const radius = 0.22;
        const shellDepth = 0.14;
        const shellGeo = new THREE.CylinderGeometry(radius, radius, shellDepth, 24);
        shellGeo.rotateX(Math.PI / 2);
        const shellMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(inst.color),
          roughness: 0.3,
          metalness: 0.25,
        });
        const shell = new THREE.Mesh(shellGeo, shellMat);
        shell.castShadow = true;
        group.add(shell);

        // Translucent Drumhead Skin
        const skinGeo = new THREE.CircleGeometry(radius * 0.94, 24);
        const skinMat = new THREE.MeshStandardMaterial({
          color: 0xfffbeb,
          roughness: 0.55,
          metalness: 0.05,
        });
        const skin = new THREE.Mesh(skinGeo, skinMat);
        skin.position.z = shellDepth / 2 + 0.002;
        skin.receiveShadow = true;
        group.add(skin);

        // Chrome Hoops / Rim
        const rimGeo = new THREE.TorusGeometry(radius, 0.016, 8, 32);
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.1 });
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.position.z = shellDepth / 2;
        group.add(rim);

        // Chrome Tuning Lugs (4 around the circumference)
        const lugGeo = new THREE.BoxGeometry(0.018, 0.035, 0.02);
        const lugMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.15 });
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 2;
          const lug = new THREE.Mesh(lugGeo, lugMat);
          lug.position.set(Math.cos(angle) * (radius + 0.008), Math.sin(angle) * (radius + 0.008), 0);
          lug.rotation.z = angle;
          group.add(lug);
        }
        break;
      }

      case 'dark_tube': {
        const height = 0.52 * (inst.scaleY || 1.0);
        const radius = 0.075;
        const tubeGeo = new THREE.CylinderGeometry(radius, radius, height, 20);
        const tubeMat = new THREE.MeshStandardMaterial({
          color: 0x18181b,
          roughness: 0.85,
          metalness: 0.12,
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        tubeMesh.castShadow = true;
        group.add(tubeMesh);

        // Gold Rim Accents at both ends
        const goldRimGeo = new THREE.TorusGeometry(radius + 0.004, 0.012, 8, 20);
        goldRimGeo.rotateX(Math.PI / 2);
        const goldRimMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.88, roughness: 0.18 });
        const topRim = new THREE.Mesh(goldRimGeo, goldRimMat);
        topRim.position.y = height / 2;
        const botRim = new THREE.Mesh(goldRimGeo, goldRimMat);
        botRim.position.y = -height / 2;
        group.add(topRim, botRim);
        break;
      }

      case 'wire_rail': {
        const railLength = 0.48;
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-railLength / 2, 0.08, 0),
          new THREE.Vector3(0, 0, 0.04),
          new THREE.Vector3(railLength / 2, -0.08, 0),
        ]);
        const railGeo = new THREE.TubeGeometry(curve, 18, 0.018, 8, false);
        const railMat = new THREE.MeshStandardMaterial({
          color: 0x94a3b8,
          metalness: 0.9,
          roughness: 0.2,
        });
        const railMesh = new THREE.Mesh(railGeo, railMat);
        railMesh.castShadow = true;
        group.add(railMesh);
        break;
      }

      case 'crystal_glass': {
        // Beveled Crystal Stemware Glass
        const bowlGeo = new THREE.CylinderGeometry(0.13, 0.07, 0.28, 20);
        const glassMat = new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          transmission: 0.92,
          transparent: true,
          opacity: 1.0,
          roughness: 0.08,
          ior: 1.52,
          thickness: 0.22,
        });
        const bowlMesh = new THREE.Mesh(bowlGeo, glassMat);
        bowlMesh.castShadow = true;
        group.add(bowlMesh);

        // Colored water inside representing pitch level
        const waterHeight = Math.min(0.22, 0.08 + inst.pitchRatio * 0.07);
        const waterGeo = new THREE.CylinderGeometry(0.11, 0.075, waterHeight, 16);
        const waterMat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(inst.color),
          transmission: 0.72,
          transparent: true,
          opacity: 0.88,
          roughness: 0.1,
        });
        const waterMesh = new THREE.Mesh(waterGeo, waterMat);
        waterMesh.position.y = -0.13 + waterHeight / 2;
        group.add(waterMesh);
        break;
      }

      case 'marimba_bar':
      case 'wood_block': {
        // Natural Light Hardwood with Beveled Edges
        const barWidth = 0.36;
        const barHeight = 0.05;
        const barDepth = 0.14;
        const blockGeo = new THREE.BoxGeometry(barWidth, barHeight, barDepth);
        const woodMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(inst.color),
          roughness: 0.55,
          metalness: 0.08,
        });
        const block = new THREE.Mesh(blockGeo, woodMat);
        block.castShadow = true;
        group.add(block);
        break;
      }

      case 'kalimba_tine':
      default: {
        const blockGeo = new THREE.BoxGeometry(0.28, 0.08, 0.1);
        const blockMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6, metalness: 0.1 });
        const block = new THREE.Mesh(blockGeo, blockMat);
        block.castShadow = true;
        group.add(block);

        const tineGeo = new THREE.BoxGeometry(0.035, 0.32, 0.012);
        const tineMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.18 });
        const tine = new THREE.Mesh(tineGeo, tineMat);
        tine.position.set(0, -0.04, 0.06);
        tine.castShadow = true;
        group.add(tine);
        break;
      }
    }

    // Dynamic Hit Light Pulse (invisible until hit)
    const hitPulseGeo = new THREE.RingGeometry(0.04, 0.28, 24);
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
    const cupGeo = new THREE.CylinderGeometry(0.55, 0.36, 0.65, 32, 1, true);
    const cupMat = new THREE.MeshPhysicalMaterial({
      color: 0xfbcfe8,
      transmission: 0.85,
      transparent: true,
      roughness: 0.1,
      ior: 1.52,
      thickness: 0.45,
    });
    const cupMesh = new THREE.Mesh(cupGeo, cupMat);
    cupMesh.castShadow = true;
    cupMesh.receiveShadow = true;
    group.add(cupMesh);

    // Soft velvet inner cushion
    const cushionGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.12, 24);
    const cushionMat = new THREE.MeshStandardMaterial({
      color: 0xec4899,
      roughness: 0.8,
      metalness: 0.05,
    });
    const cushion = new THREE.Mesh(cushionGeo, cushionMat);
    cushion.position.y = -0.24;
    group.add(cushion);

    // Golden support base
    const baseGeo = new THREE.CylinderGeometry(0.48, 0.55, 0.1, 32);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.2 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.37;
    base.castShadow = true;
    group.add(base);

    return group;
  }

  /**
   * Builds 100% Original Procedural Decor Props (Layer C)
   * Mounted on the wall outside the play corridor with soft cast shadows.
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
        const baseGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.04, 20);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.5 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.castShadow = true;
        group.add(base);

        const headGeo = new THREE.SphereGeometry(0.09, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 0.11;
        group.add(head);

        const visorGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16);
        visorGeo.rotateX(Math.PI / 2);
        const visorMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 0.12, 0.07);
        group.add(visor);

        const domeGeo = new THREE.SphereGeometry(0.17, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMat = new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          transmission: 0.9,
          transparent: true,
          roughness: 0.08,
          ior: 1.5,
        });
        const dome = new THREE.Mesh(domeGeo, domeMat);
        dome.position.y = 0.02;
        group.add(dome);
        break;
      }

      case 'tiny_shelf': {
        // Miniature wall shelf with tiny prop
        const shelfGeo = new THREE.BoxGeometry(0.32, 0.025, 0.12);
        const shelfMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.4 });
        const shelf = new THREE.Mesh(shelfGeo, shelfMat);
        shelf.castShadow = true;
        group.add(shelf);

        // Tiny prop on shelf
        const vaseGeo = new THREE.CylinderGeometry(0.03, 0.045, 0.09, 12);
        const vaseMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.2 });
        const vase = new THREE.Mesh(vaseGeo, vaseMat);
        vase.position.set(0.05, 0.055, 0);
        vase.castShadow = true;
        group.add(vase);
        break;
      }

      case 'toy_door': {
        // Miniature arched door with brass handle
        const doorGeo = new THREE.BoxGeometry(0.24, 0.38, 0.03);
        const doorMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.castShadow = true;
        group.add(door);

        const knobGeo = new THREE.SphereGeometry(0.016, 10, 10);
        const knobMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.15 });
        const knob = new THREE.Mesh(knobGeo, knobMat);
        knob.position.set(0.08, 0, 0.02);
        group.add(knob);
        break;
      }

      case 'origami_swan': {
        // Geometric folded paper swan
        const swanGeo = new THREE.ConeGeometry(0.08, 0.18, 4);
        const swanMat = new THREE.MeshStandardMaterial({ color: 0xfdf4ff, roughness: 0.7 });
        const swan = new THREE.Mesh(swanGeo, swanMat);
        swan.rotation.z = Math.PI / 4;
        swan.castShadow = true;
        group.add(swan);
        break;
      }

      case 'potted_plant': {
        const potGeo = new THREE.CylinderGeometry(0.12, 0.08, 0.15, 14);
        const potMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
        const pot = new THREE.Mesh(potGeo, potMat);
        pot.castShadow = true;
        group.add(pot);

        const leafGeo = new THREE.SphereGeometry(0.06, 8, 8);
        leafGeo.scale(1, 0.4, 1.6);
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.4 });
        for (let l = 0; l < 4; l++) {
          const leaf = new THREE.Mesh(leafGeo, leafMat);
          leaf.position.y = 0.09;
          leaf.rotation.y = (l * Math.PI) / 2;
          leaf.rotation.x = 0.3;
          group.add(leaf);
        }
        break;
      }

      case 'planet_rings': {
        const planetGeo = new THREE.SphereGeometry(0.11, 16, 16);
        const planetMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.3 });
        const planet = new THREE.Mesh(planetGeo, planetMat);
        planet.castShadow = true;
        group.add(planet);

        const ringGeo = new THREE.RingGeometry(0.15, 0.24, 24);
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
        const candyGeo = new THREE.SphereGeometry(0.11, 14, 14);
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

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 512, 128);

    ctx.font = 'bold 36px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillText(handle.text, 256 + 2, 64 + 2);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText(handle.text, 256 - 1, 64 - 1);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fillText(handle.text, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;

    const planeGeo = new THREE.PlaneGeometry(1.8, 0.45);
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
