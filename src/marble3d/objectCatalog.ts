import * as THREE from 'three';
import { TunedObjectInstance, DecorInstance, EmbossedHandleInstance, EmbossedWallTextInstance } from './types';
import { MarbleMaterialLibrary } from './materials';

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

    const heroMat = inst.material ? MarbleMaterialLibrary.getMaterial(inst.material as any, inst.color) : null;

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
        const glassMat = heroMat || new THREE.MeshPhysicalMaterial({
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
        // Signature Dual Chrome Wire Rails (2 parallel wires + cross rungs)
        const railLength = 0.52;
        const wireSpacing = 0.075;
        const wireRadius = 0.009;

        const curve1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-railLength / 2, 0.06, -wireSpacing / 2),
          new THREE.Vector3(0, 0, -wireSpacing / 2 + 0.02),
          new THREE.Vector3(railLength / 2, -0.06, -wireSpacing / 2),
        ]);
        const curve2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-railLength / 2, 0.06, wireSpacing / 2),
          new THREE.Vector3(0, 0, wireSpacing / 2 + 0.02),
          new THREE.Vector3(railLength / 2, -0.06, wireSpacing / 2),
        ]);

        const wireMat = new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          metalness: 0.95,
          roughness: 0.12,
        });

        const wireGeo1 = new THREE.TubeGeometry(curve1, 20, wireRadius, 8, false);
        const wire1 = new THREE.Mesh(wireGeo1, wireMat);
        wire1.castShadow = true;
        group.add(wire1);

        const wireGeo2 = new THREE.TubeGeometry(curve2, 20, wireRadius, 8, false);
        const wire2 = new THREE.Mesh(wireGeo2, wireMat);
        wire2.castShadow = true;
        group.add(wire2);

        // Cross rungs / pegs connecting the two parallel wires
        const rungCount = 5;
        const rungGeo = new THREE.CylinderGeometry(0.005, 0.005, wireSpacing, 8);
        rungGeo.rotateX(Math.PI / 2);
        for (let r = 0; r < rungCount; r++) {
          const frac = (r + 0.5) / rungCount;
          const p1 = curve1.getPoint(frac);
          const p2 = curve2.getPoint(frac);
          const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
          const rung = new THREE.Mesh(rungGeo, wireMat);
          rung.position.copy(mid);
          rung.castShadow = true;
          group.add(rung);
        }
        break;
      }

      case 'squeaky_duck': {
        // High-engagement original procedural yellow rubber duck with squash capability
        group.userData.isSqueaky = true;
        const yellowMat = new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          roughness: 0.38,
          metalness: 0.04,
        });

        // Duck body (rounded egg shape)
        const bodyGeo = new THREE.SphereGeometry(0.13, 18, 16);
        bodyGeo.scale(1.25, 0.95, 1.05);
        const bodyMesh = new THREE.Mesh(bodyGeo, yellowMat);
        bodyMesh.name = 'duck_body';
        bodyMesh.position.set(0, 0, 0.04);
        bodyMesh.castShadow = true;
        group.add(bodyMesh);

        // Duck head
        const headGeo = new THREE.SphereGeometry(0.08, 16, 14);
        const headMesh = new THREE.Mesh(headGeo, yellowMat);
        headMesh.position.set(0.09, 0.09, 0.06);
        headMesh.castShadow = true;
        group.add(headMesh);

        // Orange beak
        const beakGeo = new THREE.ConeGeometry(0.032, 0.065, 8);
        beakGeo.rotateZ(-Math.PI / 2);
        const beakMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3 });
        const beakMesh = new THREE.Mesh(beakGeo, beakMat);
        beakMesh.position.set(0.18, 0.08, 0.06);
        beakMesh.castShadow = true;
        group.add(beakMesh);

        // Glossy black eyes
        const eyeGeo = new THREE.SphereGeometry(0.012, 8, 8);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.1 });
        const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
        eye1.position.set(0.13, 0.12, 0.11);
        const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
        eye2.position.set(0.13, 0.12, 0.01);
        group.add(eye1, eye2);
        break;
      }

      case 'spring_smiley': {
        // Original spring-mounted smiley toy
        group.userData.isSpring = true;
        // Coiled metal spring
        const springCurve = new THREE.CatmullRomCurve3(
          Array.from({ length: 24 }, (_, i) => {
            const angle = (i / 24) * Math.PI * 6;
            const y = (i / 24) * 0.18 - 0.09;
            return new THREE.Vector3(Math.cos(angle) * 0.04, y, Math.sin(angle) * 0.04);
          })
        );
        const springGeo = new THREE.TubeGeometry(springCurve, 32, 0.007, 8, false);
        const springMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.18 });
        const springMesh = new THREE.Mesh(springGeo, springMat);
        springMesh.castShadow = true;
        group.add(springMesh);

        // Top Smiley Head
        const headGeo = new THREE.SphereGeometry(0.11, 20, 18);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.25 });
        const headMesh = new THREE.Mesh(headGeo, headMat);
        headMesh.name = 'smiley_head';
        headMesh.position.set(0, 0.14, 0.02);
        headMesh.castShadow = true;
        group.add(headMesh);

        // Cute smiling face (two tiny curved dark eyes and smile)
        const eyeGeo = new THREE.SphereGeometry(0.012, 8, 8);
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.2 });
        const e1 = new THREE.Mesh(eyeGeo, darkMat);
        e1.position.set(-0.035, 0.16, 0.12);
        const e2 = new THREE.Mesh(eyeGeo, darkMat);
        e2.position.set(0.035, 0.16, 0.12);
        group.add(e1, e2);

        // Smile arc
        const smileCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.04, 0.12, 0.11),
          new THREE.Vector3(0, 0.10, 0.12),
          new THREE.Vector3(0.04, 0.12, 0.11),
        ]);
        const smileGeo = new THREE.TubeGeometry(smileCurve, 10, 0.005, 6, false);
        const smileMesh = new THREE.Mesh(smileGeo, darkMat);
        group.add(smileMesh);
        break;
      }

      case 'unbranded_phone': {
        // Modern unbranded minimal smartphone slab
        const phoneGeo = new THREE.BoxGeometry(0.24, 0.44, 0.024);
        const bodyMat = new THREE.MeshStandardMaterial({
          color: 0x27272a,
          metalness: 0.85,
          roughness: 0.25,
        });
        const bodyMesh = new THREE.Mesh(phoneGeo, bodyMat);
        bodyMesh.castShadow = true;
        group.add(bodyMesh);

        // Illuminated screen with colorful audio waveform ringtone look
        const screenGeo = new THREE.PlaneGeometry(0.21, 0.40);
        const screenMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(inst.color || 0x38bdf8),
        });
        const screenMesh = new THREE.Mesh(screenGeo, screenMat);
        screenMesh.position.z = 0.013;
        group.add(screenMesh);
        break;
      }

      case 'unbranded_speaker': {
        // Sleek cylindrical resonator studio speaker
        const height = 0.34;
        const radius = 0.16;
        const speakerGeo = new THREE.CylinderGeometry(radius, radius, height, 24);
        speakerGeo.rotateX(Math.PI / 2);
        const speakerMat = new THREE.MeshStandardMaterial({
          color: 0x18181b,
          roughness: 0.75,
          metalness: 0.2,
        });
        const speakerMesh = new THREE.Mesh(speakerGeo, speakerMat);
        speakerMesh.castShadow = true;
        group.add(speakerMesh);

        // Speaker driver cone
        const coneGeo = new THREE.ConeGeometry(radius * 0.72, 0.04, 20);
        coneGeo.rotateX(-Math.PI / 2);
        const coneMat = new THREE.MeshStandardMaterial({
          color: 0x27272a,
          roughness: 0.4,
          metalness: 0.3,
        });
        const coneMesh = new THREE.Mesh(coneGeo, coneMat);
        coneMesh.position.z = 0.06;
        group.add(coneMesh);

        // Glowing LED ring trim
        const ledGeo = new THREE.TorusGeometry(radius * 0.85, 0.008, 8, 24);
        const ledMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        const led = new THREE.Mesh(ledGeo, ledMat);
        led.position.z = height / 2 + 0.002;
        group.add(led);
        break;
      }

      case 'brass_horn': {
        // Golden flared trumpet / horn bell
        const hornGeo = new THREE.CylinderGeometry(0.03, 0.17, 0.36, 24, 1, true);
        hornGeo.rotateZ(Math.PI / 4);
        const brassMat = new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          metalness: 0.94,
          roughness: 0.14,
        });
        const hornMesh = new THREE.Mesh(hornGeo, brassMat);
        hornMesh.castShadow = true;
        group.add(hornMesh);

        // Flared rim
        const rimGeo = new THREE.TorusGeometry(0.17, 0.012, 8, 24);
        rimGeo.rotateZ(Math.PI / 4);
        const rimMesh = new THREE.Mesh(rimGeo, brassMat);
        rimMesh.position.set(0.12, -0.12, 0);
        group.add(rimMesh);
        break;
      }

      case 'desk_bell': {
        // Classic polished hotel/reception call bell
        const bellDomeGeo = new THREE.SphereGeometry(0.17, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMat = new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          metalness: 0.95,
          roughness: 0.12,
        });
        const domeMesh = new THREE.Mesh(bellDomeGeo, domeMat);
        domeMesh.position.z = 0.03;
        domeMesh.castShadow = true;
        group.add(domeMesh);

        // Base ring flange
        const baseFlangeGeo = new THREE.CylinderGeometry(0.20, 0.20, 0.025, 24);
        baseFlangeGeo.rotateX(Math.PI / 2);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
        const baseFlange = new THREE.Mesh(baseFlangeGeo, baseMat);
        baseFlange.castShadow = true;
        group.add(baseFlange);

        // Top plunger button
        const plungerGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.08, 12);
        plungerGeo.rotateX(Math.PI / 2);
        const plunger = new THREE.Mesh(plungerGeo, domeMat);
        plunger.position.z = 0.20;
        plunger.castShadow = true;
        group.add(plunger);
        break;
      }

      case 'cymbal_drum': {
        // Drum with brass cymbal disc mounted above
        const radius = 0.20;
        const shellDepth = 0.12;
        const shellGeo = new THREE.CylinderGeometry(radius, radius, shellDepth, 20);
        shellGeo.rotateX(Math.PI / 2);
        const shellMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.3, metalness: 0.3 });
        const shell = new THREE.Mesh(shellGeo, shellMat);
        shell.castShadow = true;
        group.add(shell);

        // Shiny brass cymbal disk
        const cymbalGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.012, 28);
        cymbalGeo.rotateX(Math.PI / 2);
        const cymbalMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.94, roughness: 0.12 });
        const cymbal = new THREE.Mesh(cymbalGeo, cymbalMat);
        cymbal.position.z = shellDepth / 2 + 0.04;
        cymbal.castShadow = true;
        group.add(cymbal);
        break;
      }

      case 'split_piano_key': {
        // 3D Piano Key for split screen & staircase runs
        const keyGeo = new THREE.BoxGeometry(0.18, 0.48, 0.038);
        const isSharp = inst.note && inst.note.pitchName.includes('#');
        const keyMat = new THREE.MeshStandardMaterial({
          color: isSharp ? 0x18181b : 0xf8fafc,
          roughness: isSharp ? 0.35 : 0.15,
          metalness: 0.05,
        });
        const keyMesh = new THREE.Mesh(keyGeo, keyMat);
        keyMesh.name = 'piano_key_face';
        keyMesh.castShadow = true;
        group.add(keyMesh);
        break;
      }

      case 'prop_star': {
        // 3D 5-pointed star
        const starGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.04, 5);
        starGeo.rotateX(Math.PI / 2);
        const starMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85, roughness: 0.2 });
        const star = new THREE.Mesh(starGeo, starMat);
        star.castShadow = true;
        group.add(star);
        break;
      }

      case 'prop_heart': {
        // 3D rounded heart prop
        const heartGeo = new THREE.SphereGeometry(0.11, 16, 16);
        heartGeo.scale(1.2, 1.4, 0.6);
        const heartMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.2, metalness: 0.1 });
        const heart = new THREE.Mesh(heartGeo, heartMat);
        heart.castShadow = true;
        group.add(heart);
        break;
      }

      case 'prop_cloud': {
        // Soft puffy cloud
        const cloudGroup = new THREE.Group();
        const puffMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 });
        const p1 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), puffMat);
        const p2 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), puffMat);
        p2.position.x = 0.08;
        const p3 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), puffMat);
        p3.position.x = -0.07;
        cloudGroup.add(p1, p2, p3);
        cloudGroup.castShadow = true;
        group.add(cloudGroup);
        break;
      }

      case 'prop_snowflake': {
        // Hexagonal snowflake prop
        const snowGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.02, 6);
        snowGeo.rotateX(Math.PI / 2);
        const snowMat = new THREE.MeshStandardMaterial({ color: 0xbae6fd, roughness: 0.1, metalness: 0.2 });
        const snow = new THREE.Mesh(snowGeo, snowMat);
        snow.castShadow = true;
        group.add(snow);
        break;
      }

      case 'prop_leaf': {
        // Curved green leaf prop
        const leafGeo = new THREE.SphereGeometry(0.10, 12, 12);
        leafGeo.scale(1.4, 0.4, 0.4);
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.4 });
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.rotation.z = Math.PI / 4;
        leaf.castShadow = true;
        group.add(leaf);
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

    // Dynamic Hit Light Pulse (invisible until hit): a thin glow ring that expands and fades
    const hitPulseGeo = new THREE.RingGeometry(0.15, 0.17, 40);
    const hitPulseMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(inst.color),
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
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
        // ORIGINAL BounceForge mascot figurines under clear glass cloche dome on round black base
        // Alternates between robot-ball character and friendly kid figurine based on decor.id
        const isKidFigurine = decor.id.charCodeAt(decor.id.length - 1) % 2 === 1;

        // Solid black round pedestal base
        const baseGeo = new THREE.CylinderGeometry(0.19, 0.21, 0.045, 24);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.35, metalness: 0.15 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.castShadow = true;
        group.add(base);

        if (isKidFigurine) {
          // Original friendly stylized kid figure in orange sweater, teal pants and round cap
          const bodyGeo = new THREE.CylinderGeometry(0.045, 0.065, 0.12, 16);
          const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.6 }); // Orange sweater
          const body = new THREE.Mesh(bodyGeo, bodyMat);
          body.position.y = 0.09;
          body.castShadow = true;
          group.add(body);

          const headGeo = new THREE.SphereGeometry(0.055, 16, 16);
          const headMat = new THREE.MeshStandardMaterial({ color: 0xfed7aa, roughness: 0.4 }); // Peach skin tone
          const head = new THREE.Mesh(headGeo, headMat);
          head.position.y = 0.19;
          head.castShadow = true;
          group.add(head);

          const capGeo = new THREE.SphereGeometry(0.058, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
          const capMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.5 }); // Cyan cap
          const cap = new THREE.Mesh(capGeo, capMat);
          cap.position.y = 0.20;
          cap.castShadow = true;
          group.add(cap);
        } else {
          // Original friendly BounceForge robot-ball mascot
          const botBodyGeo = new THREE.SphereGeometry(0.095, 20, 20);
          const botBodyMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.25, metalness: 0.1 });
          const botBody = new THREE.Mesh(botBodyGeo, botBodyMat);
          botBody.position.y = 0.11;
          botBody.castShadow = true;
          group.add(botBody);

          // Glowing friendly digital visor
          const visorGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.02, 16);
          visorGeo.rotateX(Math.PI / 2);
          const visorMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
          const visor = new THREE.Mesh(visorGeo, visorMat);
          visor.position.set(0, 0.12, 0.075);
          group.add(visor);

          // Antenna with tiny ball on top
          const antGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.05, 8);
          const antMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
          const ant = new THREE.Mesh(antGeo, antMat);
          ant.position.set(0, 0.21, 0);
          const tipGeo = new THREE.SphereGeometry(0.015, 8, 8);
          const tipMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
          const tip = new THREE.Mesh(tipGeo, tipMat);
          tip.position.set(0, 0.24, 0);
          group.add(ant, tip);
        }

        // Clear glass cloche bell jar dome
        const domeGeo = new THREE.SphereGeometry(0.18, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMat = new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          transmission: 0.94,
          transparent: true,
          roughness: 0.04,
          ior: 1.52,
          thickness: 0.2,
        });
        const dome = new THREE.Mesh(domeGeo, domeMat);
        dome.position.y = 0.025;
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
        // Original rounded-arch door in pastel mint or lilac with brass handle and window
        const isLilac = decor.id.charCodeAt(decor.id.length - 1) % 2 === 1;
        const doorColor = isLilac ? 0xd8b4fe : 0xa7f3d0; // Lilac or Mint
        const frameColor = isLilac ? 0xc084fc : 0x6ee7b7;

        // Rounded arch door slab
        const doorGeo = new THREE.BoxGeometry(0.26, 0.42, 0.035);
        const doorMat = new THREE.MeshStandardMaterial({ color: doorColor, roughness: 0.38 });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.castShadow = true;
        group.add(door);

        // Top arch round trim
        const archGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.038, 20, 1, false, 0, Math.PI);
        archGeo.rotateZ(Math.PI / 2);
        const archMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.4 });
        const arch = new THREE.Mesh(archGeo, archMat);
        arch.position.y = 0.21;
        arch.castShadow = true;
        group.add(arch);

        // Circular porthole glass window with brass rim
        const winGeo = new THREE.CircleGeometry(0.048, 18);
        const winMat = new THREE.MeshPhysicalMaterial({
          color: 0xe0f2fe,
          transmission: 0.85,
          transparent: true,
          roughness: 0.1,
          ior: 1.5,
        });
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.set(0, 0.08, 0.02);
        group.add(win);

        const winRimGeo = new THREE.TorusGeometry(0.049, 0.008, 8, 20);
        const brassMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.92, roughness: 0.18 });
        const winRim = new THREE.Mesh(winRimGeo, brassMat);
        winRim.position.set(0, 0.08, 0.02);
        group.add(winRim);

        // Polished brass door lever handle
        const handleStem = new THREE.CylinderGeometry(0.006, 0.006, 0.025, 8);
        handleStem.rotateX(Math.PI / 2);
        const stem = new THREE.Mesh(handleStem, brassMat);
        stem.position.set(0.085, -0.04, 0.025);
        const leverGeo = new THREE.BoxGeometry(0.045, 0.012, 0.01);
        const lever = new THREE.Mesh(leverGeo, brassMat);
        lever.position.set(0.095, -0.04, 0.038);
        lever.castShadow = true;
        group.add(stem, lever);
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
   * Builds Embossed 3D Handle text on the wall using the world's hero material styling
   */
  static createEmbossedHandleMesh(handle: EmbossedHandleInstance, materialType: string = 'brushed_gold'): THREE.Group {
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

    // Shadow bevel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillText(handle.text, 256 + 2, 64 + 2);

    // World material color accents
    if (materialType.includes('gold') || materialType.includes('amber')) {
      ctx.fillStyle = 'rgba(251, 191, 36, 0.75)';
    } else if (materialType.includes('ice') || materialType.includes('crystal')) {
      ctx.fillStyle = 'rgba(186, 230, 253, 0.85)';
    } else if (materialType.includes('neon')) {
      ctx.fillStyle = 'rgba(236, 72, 153, 0.9)';
    } else if (materialType.includes('emerald') || materialType.includes('jade')) {
      ctx.fillStyle = 'rgba(52, 211, 153, 0.8)';
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    }
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

  /**
   * Builds Embossed/Debossed 3D Wall Text that scrolls with the scene.
   * Shaded with directional highlight on top-left and soft shadow on bottom-right,
   * lit by the same key light as the wall.
   */
  static createEmbossedWallTextMesh(
    inst: EmbossedWallTextInstance,
    wallColorHex: string = '#2C2C30'
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `embossed_text_${inst.id}`;
    group.position.set(inst.x, inst.y, inst.z);
    group.userData.initialY = inst.y;
    group.userData.revealAtTime = inst.revealAtTime;
    group.userData.type = inst.type;

    const isDebossed = inst.embossMode === 'debossed';
    const fontStyle = inst.fontStyle || 'script';

    // Canvas resolution tuned for razor-sharp 4K legibility
    const canvas = document.createElement('canvas');
    const isTitle = inst.type === 'title' || inst.type === 'reveal_answer';
    const isActNumber = inst.type === 'act_number';
    const canvasWidth = isActNumber ? 256 : isTitle ? 1024 : 640;
    const canvasHeight = isActNumber ? 256 : isTitle ? 320 : 200;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Font selection based on 3 font styles
    let fontFace = 'sans-serif';
    let fontSize = isActNumber ? 120 : isTitle ? 72 : 36;
    let fontWeight = 'bold';
    let fontStylePrefix = '';

    if (fontStyle === 'script') {
      fontFace = '"Brush Script MT", "Caveat", "Dancing Script", "Pacifico", "Segoe Script", cursive, sans-serif';
      fontWeight = '600';
      fontSize = isActNumber ? 130 : isTitle ? 88 : 66;
    } else if (fontStyle === 'bold_cartoon') {
      fontFace = '"Titan One", "Comic Sans MS", "Arial Rounded MT Bold", "Fredoka One", cursive, sans-serif';
      fontWeight = '900';
      fontSize = isActNumber ? 130 : isTitle ? 80 : 58;
    } else if (fontStyle === 'bold_italic_serif') {
      // Open-license bold italic serif (Playfair, Georgia, Merriweather, Garamond)
      fontFace = '"Playfair Display", "Merriweather", "Georgia", "Baskerville", "Times New Roman", serif';
      fontWeight = '800';
      fontStylePrefix = 'italic ';
      fontSize = isActNumber ? 125 : isTitle ? 82 : 60;
    } else {
      fontFace = '"Inter", "Helvetica Neue", Arial, sans-serif';
      fontWeight = '800';
      fontSize = isActNumber ? 110 : isTitle ? 68 : 34;
    }

    ctx.font = `${fontStylePrefix}${fontWeight} ${fontSize}px ${fontFace}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lines = inst.text.split('\n');
    const lineHeight = fontSize * 1.15;
    const startY = canvasHeight / 2 - ((lines.length - 1) * lineHeight) / 2;

    for (let li = 0; li < lines.length; li++) {
      const lineText = lines[li];
      const cy = startY + li * lineHeight;
      const cx = canvasWidth / 2;

      if (fontStyle === 'bold_cartoon') {
        // Playful cartoon letters: thick dark outline + vibrant yellow/cyan fill
        ctx.lineJoin = 'round';
        ctx.lineWidth = 14;
        ctx.strokeStyle = '#18181b';
        ctx.strokeText(lineText, cx, cy);

        // Highlight bevel
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#27272a';
        ctx.strokeText(lineText, cx - 2, cy - 2);

        // Vibrant fill
        ctx.fillStyle = inst.color || '#facc15';
        ctx.fillText(lineText, cx, cy);
      } else {
        // Architectural Embossed / Debossed Relief
        // Top-left key light -> casts highlight on top-left (-x, -y) and shadow on bottom-right (+x, +y)
        const offset = Math.max(2, Math.round(fontSize * 0.055));

        if (!isDebossed) {
          // EMBOSSED (Raised from the wall)
          // 1. Soft bottom-right drop shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
          ctx.fillText(lineText, cx + offset, cy + offset);

          // 2. Secondary deeper drop shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
          ctx.fillText(lineText, cx + offset * 1.8, cy + offset * 1.8);

          // 3. Top-left light reflection / highlight
          ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
          ctx.fillText(lineText, cx - offset * 0.8, cy - offset * 0.8);

          // 4. Face fill (matches wall color, rainbow gradient, or custom tint)
          if (inst.rainbowGradient) {
            // Soft rainbow gradient fill (pink -> yellow -> green -> blue)
            const textMetrics = ctx.measureText(lineText);
            const halfW = textMetrics.width / 2;
            const grad = ctx.createLinearGradient(cx - halfW, cy, cx + halfW, cy);
            grad.addColorStop(0.0, '#ff8fb8');
            grad.addColorStop(0.33, '#ffe68a');
            grad.addColorStop(0.66, '#86efac');
            grad.addColorStop(1.0, '#9cc8ff');
            ctx.fillStyle = grad;
          } else if (inst.color) {
            ctx.fillStyle = inst.color;
          } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
          }
          ctx.fillText(lineText, cx, cy);
        } else {
          // DEBOSSED (Carved into the wall)
          // 1. Top-left inner shadow (carved cavity)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
          ctx.fillText(lineText, cx - offset, cy - offset);

          // 2. Bottom-right inner highlight (carved lip catches key light)
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.fillText(lineText, cx + offset * 0.8, cy + offset * 0.8);

          // 3. Recessed interior
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.fillText(lineText, cx, cy);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;

    const aspect = canvasWidth / canvasHeight;
    const planeHeight = (isActNumber ? 0.65 : isTitle ? 1.05 : 0.5) * inst.scale;
    const planeWidth = planeHeight * aspect;

    const planeGeo = new THREE.PlaneGeometry(planeWidth, planeHeight);
    const planeMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: inst.revealAtTime ? 0 : 1, // hidden until reveal
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.name = 'text_plane';
    group.add(plane);

    return group;
  }
}
