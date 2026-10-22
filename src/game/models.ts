import * as THREE from 'three';
import { CharacterConfig } from '../types';
import { createSignTexture, createStopSignTexture } from './textures';

/**
 * Procedural 3D Models for CityLife RP
 * Complies with the 3-12 part procedural group rule and bottom-centered pivots.
 */

// Shared reusable materials & geometries for performance
const glassMaterial = new THREE.MeshStandardMaterial({
  color: 0x334466,
  metalness: 0.2,
  roughness: 0.1,
  transparent: true,
  opacity: 0.6,
});

const chromeMaterial = new THREE.MeshStandardMaterial({
  color: 0xd8d8d8,
  metalness: 0.9,
  roughness: 0.15,
});

const tireMaterial = new THREE.MeshStandardMaterial({
  color: 0x1a1a1a,
  roughness: 0.8,
  metalness: 0.1,
});

export interface CharacterRig {
  group: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  head: THREE.Group;
  backpack: THREE.Mesh;
  updateAnimation: (speed: number, isRunning: boolean, isJumping: boolean, time: number, isPunching?: boolean) => void;
  setBackpackVisible: (visible: boolean) => void;
}

export function createCharacterRig(config: CharacterConfig): CharacterRig {
  const group = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({
    color: config.skinTone || '#d29b74',
    roughness: 0.7,
    metalness: 0.05,
  });

  const hairMat = new THREE.MeshStandardMaterial({
    color: config.hairColor || '#1a1105',
    roughness: 0.85,
  });

  const topMat = new THREE.MeshStandardMaterial({
    color: config.topColor || '#2563eb',
    roughness: 0.6,
  });

  const bottomMat = new THREE.MeshStandardMaterial({
    color: config.bottomColor || '#1e293b',
    roughness: 0.7,
  });

  const shoesMat = new THREE.MeshStandardMaterial({
    color: config.shoesColor || '#ffffff',
    roughness: 0.5,
  });

  // Pelvis / Hips (centered at y=0.88)
  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.22), bottomMat);
  hips.position.y = 0.88;
  hips.castShadow = true;
  group.add(hips);

  // Left Leg Pivot (at hip level y=0.84)
  // Leg extends from y=0.84 down to y=0.16; shoe from y=0.16 to y=0.00 (flush on ground)
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.11, 0.84, 0);
  const leftLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.68, 0.16), bottomMat);
  leftLegMesh.position.y = -0.34;
  leftLegMesh.castShadow = true;
  leftLeg.add(leftLegMesh);

  // Left Shin / Shoe (bottom flush at y=0.0)
  const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.16, 0.25), shoesMat);
  leftShoe.position.set(0, -0.76, 0.03);
  leftShoe.castShadow = true;
  leftLeg.add(leftShoe);
  group.add(leftLeg);

  // Right Leg Pivot (at hip level y=0.84)
  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.11, 0.84, 0);
  const rightLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.68, 0.16), bottomMat);
  rightLegMesh.position.y = -0.34;
  rightLegMesh.castShadow = true;
  rightLeg.add(rightLegMesh);

  // Right Shin / Shoe (bottom flush at y=0.0)
  const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.16, 0.25), shoesMat);
  rightShoe.position.set(0, -0.76, 0.03);
  rightShoe.castShadow = true;
  rightLeg.add(rightShoe);
  group.add(rightLeg);

  // Torso / Shirt
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.46, 0.24), topMat);
  torso.position.y = 1.18;
  torso.castShadow = true;
  group.add(torso);

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 8), skinMat);
  neck.position.y = 1.44;
  group.add(neck);

  // Head Group (for looking or slight tilt)
  const head = new THREE.Group();
  head.position.y = 1.62;

  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.26), skinMat);
  headMesh.castShadow = true;
  head.add(headMesh);

  // Eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), eyeMat);
  leftEye.position.set(-0.07, 0.02, 0.135);
  head.add(leftEye);

  const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), eyeMat);
  rightEye.position.set(0.07, 0.02, 0.135);
  head.add(rightEye);

  // Hair styles
  const hairGroup = new THREE.Group();
  if (config.hairStyle === 'raspado') {
    const hairMesh = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.06, 0.27), hairMat);
    hairMesh.position.y = 0.12;
    hairGroup.add(hairMesh);
  } else if (config.hairStyle === 'degrade') {
    const topHair = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.26), hairMat);
    topHair.position.y = 0.16;
    hairGroup.add(topHair);
  } else if (config.hairStyle === 'dreads') {
    const baseHair = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.28), hairMat);
    baseHair.position.y = 0.14;
    hairGroup.add(baseHair);
    // Extra dread hanging pieces
    for (let i = -2; i <= 2; i++) {
      const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2), hairMat);
      strand.position.set(i * 0.06, 0.02, -0.14);
      hairGroup.add(strand);
    }
  } else if (config.hairStyle === 'longo') {
    const topHair = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.28), hairMat);
    topHair.position.y = 0.14;
    hairGroup.add(topHair);
    const backHair = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.08), hairMat);
    backHair.position.set(0, -0.04, -0.14);
    hairGroup.add(backHair);
  } else {
    // Default 'curto'
    const topHair = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.1, 0.27), hairMat);
    topHair.position.y = 0.14;
    hairGroup.add(topHair);
  }
  head.add(hairGroup);
  group.add(head);

  // Left Arm (pivot at shoulder y=1.38)
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.27, 1.36, 0);
  const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.38, 0.12), topMat);
  leftArmMesh.position.y = -0.17;
  leftArmMesh.castShadow = true;
  leftArm.add(leftArmMesh);
  const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.09), skinMat);
  leftHand.position.y = -0.38;
  leftArm.add(leftHand);
  group.add(leftArm);

  // Right Arm (pivot at shoulder)
  const rightArm = new THREE.Group();
  rightArm.position.set(0.27, 1.36, 0);
  const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.38, 0.12), topMat);
  rightArmMesh.position.y = -0.17;
  rightArmMesh.castShadow = true;
  rightArm.add(rightArmMesh);
  const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.09), skinMat);
  rightHand.position.y = -0.38;
  rightArm.add(rightHand);
  group.add(rightArm);

  // Delivery Thermal Backpack (Mochila de Entrega Flash Express)
  const deliveryBagMat = new THREE.MeshStandardMaterial({
    color: 0xef4444, // Vibrant red/orange delivery box
    roughness: 0.5,
  });
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.24), deliveryBagMat);
  backpack.position.set(0, 1.2, -0.22);
  backpack.castShadow = true;
  backpack.visible = false;
  group.add(backpack);

  // Soft Contact Shadow
  const shadowGeo = new THREE.PlaneGeometry(0.7, 0.7);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.02;
  group.add(shadowMesh);

  // Animation controller
  const updateAnimation = (
    speed: number,
    isRunning: boolean,
    isJumping: boolean,
    time: number,
    isPunching: boolean = false
  ) => {
    if (isPunching) {
      rightArm.rotation.x = -1.55;
      rightArm.rotation.y = -0.25;
      rightArm.position.z = 0.18;
      torso.rotation.y = -0.22;
    } else {
      rightArm.position.z = 0;
      torso.rotation.y = 0;
    }

    if (isJumping) {
      // In air pose
      leftLeg.rotation.x = -0.4;
      rightLeg.rotation.x = 0.5;
      leftArm.rotation.x = -0.8;
      if (!isPunching) rightArm.rotation.x = -0.8;
      torso.rotation.x = 0.1;
      return;
    }

    if (speed > 0.05) {
      const freq = isRunning ? 16 : 9;
      const amp = isRunning ? 0.9 : 0.55;
      const swing = Math.sin(time * freq) * amp;

      leftLeg.rotation.x = swing;
      rightLeg.rotation.x = -swing;
      leftArm.rotation.x = -swing * 0.9;
      if (!isPunching) rightArm.rotation.x = swing * 0.9;

      // Slight forward lean when running
      torso.rotation.x = isRunning ? 0.18 : 0.05;
      hips.position.y = 0.88 + Math.abs(Math.sin(time * freq * 2)) * 0.04;
    } else {
      // Idle breathing
      const idle = Math.sin(time * 2.2) * 0.03;
      leftLeg.rotation.x = 0;
      rightLeg.rotation.x = 0;
      leftArm.rotation.x = idle;
      if (!isPunching) rightArm.rotation.x = -idle;
      torso.rotation.x = 0;
      hips.position.y = 0.88;
      head.position.y = 1.62 + idle * 0.3;
    }
  };

  const setBackpackVisible = (visible: boolean) => {
    backpack.visible = visible;
  };

  return {
    group,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    head,
    backpack,
    updateAnimation,
    setBackpackVisible,
  };
}

export interface CarRig {
  group: THREE.Group;
  wheels: THREE.Mesh[];
  frontLeftSteer: THREE.Group;
  frontRightSteer: THREE.Group;
  headlights: THREE.Mesh[];
  setSteerAngle: (angle: number) => void;
  rollWheels: (distanceDelta: number) => void;
  setColor: (colorHex: string) => void;
  bodyMaterial: THREE.MeshStandardMaterial;
}

export function createCarRig(initialColor: string = '#2563eb'): CarRig {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: initialColor,
    metalness: 0.8,
    roughness: 0.25,
  });

  const blackTrimMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.7,
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfff0c0,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });

  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0x991b1b,
    emissiveIntensity: 0.8,
  });

  // 1. Lower Chassis (hull)
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.48, 4.2), bodyMat);
  chassis.position.y = 0.46;
  chassis.castShadow = true;
  group.add(chassis);

  // 2. Cabin / Greenhouse
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.52, 2.3), bodyMat);
  cabin.position.set(0, 0.92, -0.2);
  cabin.castShadow = true;
  group.add(cabin);

  // 3. Front Windshield (slanted)
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.46, 0.08), glassMaterial);
  windshield.position.set(0, 0.9, 0.96);
  windshield.rotation.x = 0.45;
  group.add(windshield);

  // 4. Rear Windshield
  const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.46, 0.08), glassMaterial);
  rearWindow.position.set(0, 0.9, -1.34);
  rearWindow.rotation.x = -0.45;
  group.add(rearWindow);

  // 5. Side Windows
  const sideWindowLeft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 2.05), glassMaterial);
  sideWindowLeft.position.set(-0.81, 0.9, -0.2);
  group.add(sideWindowLeft);

  const sideWindowRight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 2.05), glassMaterial);
  sideWindowRight.position.set(0.81, 0.9, -0.2);
  group.add(sideWindowRight);

  // 6. Front Grille & Bumper
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.26, 0.22), blackTrimMat);
  frontBumper.position.set(0, 0.32, 2.12);
  group.add(frontBumper);

  // 7. Rear Bumper
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.26, 0.22), blackTrimMat);
  rearBumper.position.set(0, 0.32, -2.12);
  group.add(rearBumper);

  // 8. Headlights
  const leftHeadlight = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.08), headlightMat);
  leftHeadlight.position.set(-0.66, 0.52, 2.11);
  group.add(leftHeadlight);

  const rightHeadlight = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.08), headlightMat);
  rightHeadlight.position.set(0.66, 0.52, 2.11);
  group.add(rightHeadlight);

  // 9. Taillights
  const leftTaillight = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.08), taillightMat);
  leftTaillight.position.set(-0.66, 0.52, -2.11);
  group.add(leftTaillight);

  const rightTaillight = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.08), taillightMat);
  rightTaillight.position.set(0.66, 0.52, -2.11);
  group.add(rightTaillight);

  // 10. Mercosul License Plate (Front & Back)
  const plateMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
  const frontPlate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.04), plateMat);
  frontPlate.position.set(0, 0.3, 2.22);
  group.add(frontPlate);

  const rearPlate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.04), plateMat);
  rearPlate.position.set(0, 0.3, -2.22);
  group.add(rearPlate);

  // 11. Wheels Construction
  const wheels: THREE.Mesh[] = [];
  const wheelRadius = 0.35;
  const wheelWidth = 0.24;

  const createWheelMesh = () => {
    const wGroup = new THREE.Group();
    // Tire
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16), tireMaterial);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wGroup.add(tire);
    // Rim
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.65, wheelRadius * 0.65, wheelWidth + 0.02, 12), chromeMaterial);
    rim.rotation.z = Math.PI / 2;
    wGroup.add(rim);

    // Spokes accent
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(wheelWidth + 0.03, wheelRadius * 1.1, 0.04), blackTrimMat);
    wGroup.add(spoke);

    return wGroup as unknown as THREE.Mesh;
  };

  // Front Left Steering Pivot
  const frontLeftSteer = new THREE.Group();
  frontLeftSteer.position.set(-0.96, wheelRadius, 1.25);
  const flWheel = createWheelMesh();
  frontLeftSteer.add(flWheel);
  group.add(frontLeftSteer);
  wheels.push(flWheel);

  // Front Right Steering Pivot
  const frontRightSteer = new THREE.Group();
  frontRightSteer.position.set(0.96, wheelRadius, 1.25);
  const frWheel = createWheelMesh();
  frontRightSteer.add(frWheel);
  group.add(frontRightSteer);
  wheels.push(frWheel);

  // Rear Left Wheel (fixed)
  const rlWheelGroup = new THREE.Group();
  rlWheelGroup.position.set(-0.96, wheelRadius, -1.25);
  const rlWheel = createWheelMesh();
  rlWheelGroup.add(rlWheel);
  group.add(rlWheelGroup);
  wheels.push(rlWheel);

  // Rear Right Wheel (fixed)
  const rrWheelGroup = new THREE.Group();
  rrWheelGroup.position.set(0.96, wheelRadius, -1.25);
  const rrWheel = createWheelMesh();
  rrWheelGroup.add(rrWheel);
  group.add(rrWheelGroup);
  wheels.push(rrWheel);

  // Contact Shadow underneath car
  const shadowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 4.4),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false })
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.02;
  group.add(shadowMesh);

  const setSteerAngle = (angle: number) => {
    frontLeftSteer.rotation.y = angle;
    frontRightSteer.rotation.y = angle;
  };

  const rollWheels = (distanceDelta: number) => {
    const rotDelta = distanceDelta / wheelRadius;
    wheels.forEach((w) => {
      w.rotation.x += rotDelta;
    });
  };

  const setColor = (colorHex: string) => {
    bodyMat.color.set(colorHex);
  };

  return {
    group,
    wheels,
    frontLeftSteer,
    frontRightSteer,
    headlights: [leftHeadlight, rightHeadlight],
    setSteerAngle,
    rollWheels,
    setColor,
    bodyMaterial: bodyMat,
  };
}

// Brazilian Commercial or Residential Building
export function createBuilding(width: number, height: number, depth: number, colorHex: number, accentColorHex: number): THREE.Group {
  const building = new THREE.Group();

  const wallMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.8,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColorHex,
    roughness: 0.6,
  });

  // Main Structure
  const main = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMat);
  main.position.y = height / 2;
  main.castShadow = true;
  main.receiveShadow = true;
  building.add(main);

  // Base Foundation Trim
  const baseTrim = new THREE.Mesh(new THREE.BoxGeometry(width + 0.3, 1.2, depth + 0.3), accentMat);
  baseTrim.position.y = 0.6;
  building.add(baseTrim);

  // Roof Cornice
  const roofCornice = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, 0.5, depth + 0.4), accentMat);
  roofCornice.position.y = height + 0.25;
  building.add(roofCornice);

  // Classic Brazilian Blue Water Tank on Roof (Caixa d'água Fortlev/Tigre)
  const tankMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 });
  const waterTank = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 1.2, 10), tankMat);
  waterTank.position.set(width * 0.2, height + 0.9, depth * 0.2);
  building.add(waterTank);

  // Antenna
  const antennaMat = new THREE.MeshStandardMaterial({ color: 0x71717a });
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3, 6), antennaMat);
  antenna.position.set(-width * 0.25, height + 1.7, -depth * 0.25);
  building.add(antenna);

  // Window Grid
  const windowRows = Math.floor(height / 3.2);
  const windowCols = Math.max(1, Math.floor(width / 3.4));

  for (let r = 1; r < windowRows; r++) {
    for (let c = 0; c < windowCols; c++) {
      const wx = -width / 2 + (c + 0.5) * (width / windowCols);
      const wy = r * 3.2 + 0.8;

      // Front Window
      const winFront = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 0.1), glassMaterial);
      winFront.position.set(wx, wy, depth / 2 + 0.05);
      building.add(winFront);

      // Back Window
      const winBack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 0.1), glassMaterial);
      winBack.position.set(wx, wy, -depth / 2 - 0.05);
      building.add(winBack);
    }
  }

  return building;
}

// Brazilian Suburban House (Sobrado / Casa térrea com telhado colonial)
export function createHouse(colorHex: number, roofColorHex: number = 0xc2410c): THREE.Group {
  const house = new THREE.Group();

  const wallMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.8 });
  const roofMat = new THREE.MeshStandardMaterial({ color: roofColorHex, roughness: 0.85 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });

  // Main room
  const body = new THREE.Mesh(new THREE.BoxGeometry(8, 4.2, 7), wallMat);
  body.position.y = 2.1;
  body.castShadow = true;
  body.receiveShadow = true;
  house.add(body);

  // Slanted Roof (Brazilian Ceramic Roof)
  const roofGeo = new THREE.ConeGeometry(6.2, 2.2, 4);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, 5.3, 0);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.15, 1, 0.95);
  roof.castShadow = true;
  house.add(roof);

  // Front Porch Columns
  const colMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9 });
  const col1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.8, 8), colMat);
  col1.position.set(-3.2, 1.4, 4.1);
  house.add(col1);

  const col2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.8, 8), colMat);
  col2.position.set(3.2, 1.4, 4.1);
  house.add(col2);

  // Porch roof
  const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.25, 1.4), roofMat);
  porchRoof.position.set(0, 2.9, 4.1);
  house.add(porchRoof);

  // Wooden Front Door
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.1), woodMat);
  door.position.set(0, 1.1, 3.55);
  house.add(door);

  // Windows
  const win1 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.3, 0.1), glassMaterial);
  win1.position.set(-2.2, 2.0, 3.55);
  house.add(win1);

  const win2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.3, 0.1), glassMaterial);
  win2.position.set(2.2, 2.0, 3.55);
  house.add(win2);

  // Low perimeter wall with front gate
  const wallMatLow = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9 });
  const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 8.5), wallMatLow);
  wallL.position.set(-4.5, 0.6, 1.5);
  house.add(wallL);

  const wallR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 8.5), wallMatLow);
  wallR.position.set(4.5, 0.6, 1.5);
  house.add(wallR);

  return house;
}

// Streetlight (Poste de Iluminação Pública com lâmpada)
export function createStreetLight(): THREE.Group {
  const pole = new THREE.Group();

  const metalMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.4 });
  const lampGlowMat = new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0xfef08a, emissiveIntensity: 1.2 });

  // Vertical pole
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 8), metalMat);
  shaft.position.y = 3;
  shaft.castShadow = true;
  pole.add(shaft);

  // Curved horizontal arm
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.1), metalMat);
  arm.position.set(0.75, 5.9, 0);
  pole.add(arm);

  // Lamp casing
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.3), metalMat);
  lamp.position.set(1.4, 5.85, 0);
  pole.add(lamp);

  // Light emitter
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.24), lampGlowMat);
  glow.position.set(1.4, 5.74, 0);
  pole.add(glow);

  return pole;
}

// Brazilian Palm Tree (Palmeira Imperial / Coqueiro)
export function createPalmTree(): THREE.Group {
  const tree = new THREE.Group();

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78553d, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d6a2e, roughness: 0.7, side: THREE.DoubleSide });

  // Segmented Trunk with slight natural curve
  const trunkSegments = 6;
  const segHeight = 1.1;
  for (let i = 0; i < trunkSegments; i++) {
    const radius = 0.24 - i * 0.02;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.95, radius, segHeight, 8), trunkMat);
    seg.position.set(Math.sin(i * 0.2) * 0.12, i * segHeight + segHeight / 2, 0);
    seg.rotation.z = -0.04;
    seg.castShadow = true;
    tree.add(seg);
  }

  // Crown of 8 Palm Fronds (leaves)
  const topY = trunkSegments * segHeight;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 0.45), leafMat);
    leaf.position.set(Math.cos(angle) * 1.1, topY + 0.1, Math.sin(angle) * 1.1);
    leaf.rotation.y = angle;
    leaf.rotation.z = -0.4;
    leaf.castShadow = true;
    tree.add(leaf);
  }

  return tree;
}

// Brazilian Ipê Tree (Árvore Ipê Amarelo)
export function createIpeTree(): THREE.Group {
  const tree = new THREE.Group();

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x543d2b, roughness: 0.9 });
  const blossomMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.8 }); // Yellow golden ipê

  // Main Trunk
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 3.2, 8), trunkMat);
  trunk.position.y = 1.6;
  trunk.castShadow = true;
  tree.add(trunk);

  // Canopy Blobs (Ipê Floral Crown)
  const canopy1 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.1, 1), blossomMat);
  canopy1.position.set(0, 4.3, 0);
  canopy1.castShadow = true;
  tree.add(canopy1);

  const canopy2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5, 1), blossomMat);
  canopy2.position.set(1.0, 3.8, 0.6);
  canopy2.castShadow = true;
  tree.add(canopy2);

  const canopy3 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 1), blossomMat);
  canopy3.position.set(-0.9, 3.9, -0.7);
  canopy3.castShadow = true;
  tree.add(canopy3);

  return tree;
}

// Store Building with procedural billboard sign
export function createStore(title: string, subtitle: string, brandColor: string, isOficina: boolean = false): THREE.Group {
  const store = new THREE.Group();

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 });
  const trimMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(brandColor), roughness: 0.5 });

  // Main building body
  const body = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 8), wallMat);
  body.position.y = 2.5;
  body.castShadow = true;
  body.receiveShadow = true;
  store.add(body);

  // Front Fascia / Awning Header
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(10.2, 1.4, 0.4), trimMat);
  fascia.position.set(0, 4.4, 4.1);
  store.add(fascia);

  // Store Signboard
  const signTex = createSignTexture(title, subtitle, brandColor);
  const signMat = new THREE.MeshBasicMaterial({ map: signTex });
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(8, 2.0), signMat);
  signMesh.position.set(0, 4.4, 4.32);
  store.add(signMesh);

  if (isOficina) {
    // Large roll-up garage door
    const garageDoorMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.4, roughness: 0.5 });
    const door = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.2, 0.2), garageDoorMat);
    door.position.set(0, 1.6, 4.02);
    store.add(door);
  } else {
    // Glass Display Windows and Glass Entrance Door
    const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(7, 2.6, 0.1), glassMaterial);
    windowMesh.position.set(0, 1.7, 4.05);
    store.add(windowMesh);

    // Brazilian bakery striped awning (Toldo listrado)
    const awningMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
    const awning = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.15, 1.4), awningMat);
    awning.position.set(0, 3.2, 4.7);
    awning.rotation.x = 0.25;
    store.add(awning);
  }

  return store;
}

// Central Delivery Hub (Flash Express)
export function createDeliveryHubBuilding(): THREE.Group {
  const hub = new THREE.Group();

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });

  // Main warehouse
  const body = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 12), wallMat);
  body.position.y = 3;
  body.castShadow = true;
  body.receiveShadow = true;
  hub.add(body);

  // Orange brand header
  const header = new THREE.Mesh(new THREE.BoxGeometry(14.3, 1.6, 0.4), orangeMat);
  header.position.set(0, 5.2, 6.1);
  hub.add(header);

  // Big Signboard
  const signTex = createSignTexture('FLASH EXPRESS', 'CENTRAL DE ENTREGAS & LOGÍSTICA', '#ea580c');
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.4), new THREE.MeshBasicMaterial({ map: signTex }));
  signMesh.position.set(0, 5.2, 6.32);
  hub.add(signMesh);

  // Two loading dock bay doors
  const bayMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5 });
  const bay1 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.4, 0.2), bayMat);
  bay1.position.set(-3.5, 1.7, 6.05);
  hub.add(bay1);

  const bay2 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.4, 0.2), bayMat);
  bay2.position.set(3.5, 1.7, 6.05);
  hub.add(bay2);

  // Interaction Pillar / Dispatch desk
  const deskMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xc2410c, emissiveIntensity: 0.3 });
  const desk = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 1.1, 12), deskMat);
  desk.position.set(0, 0.55, 7.8);
  hub.add(desk);

  return hub;
}

// 3D Floating Beacon / Waypoint Marker (Cilindro holográfico pulsante)
export function createWaypointMarker(colorHex: number = 0xf59e0b): THREE.Group {
  const marker = new THREE.Group();

  const mat = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // Vertical light beacon cylinder
  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 8, 16, 1, true), mat);
  cylinder.position.y = 4;
  marker.add(cylinder);

  // Floating Diamond / Arrow indicator on top
  const diamondGeo = new THREE.OctahedronGeometry(0.8);
  const diamondMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.8,
  });
  const diamond = new THREE.Mesh(diamondGeo, diamondMat);
  diamond.position.y = 3.5;
  diamond.name = 'diamondIndicator';
  marker.add(diamond);

  // Concentric ring on ground
  const ringGeo = new THREE.RingGeometry(1.2, 1.7, 24);
  const ring = new THREE.Mesh(ringGeo, mat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  marker.add(ring);

  return marker;
}

// Player's House Exterior (Minha Casa)
export function createPlayerHouse(): THREE.Group {
  const house = new THREE.Group();

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.7 }); // Friendly light blue
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.85 }); // Terracotta
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });

  // Main house body
  const body = new THREE.Mesh(new THREE.BoxGeometry(9, 4.4, 8), wallMat);
  body.position.y = 2.2;
  body.castShadow = true;
  body.receiveShadow = true;
  house.add(body);

  // Colonial Roof
  const roofGeo = new THREE.ConeGeometry(7, 2.4, 4);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, 5.5, 0);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.15, 1, 1.05);
  roof.castShadow = true;
  house.add(roof);

  // Porch
  const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(8, 0.25, 1.8), roofMat);
  porchRoof.position.set(0, 3.0, 4.8);
  house.add(porchRoof);

  const colMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc });
  const colL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.9, 8), colMat);
  colL.position.set(-3.5, 1.45, 5.5);
  house.add(colL);

  const colR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.9, 8), colMat);
  colR.position.set(3.5, 1.45, 5.5);
  house.add(colR);

  // Front Door (Recessed slightly with interactive door frame)
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.4, 0.15), woodMat);
  door.position.set(0, 1.2, 4.05);
  house.add(door);

  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.55, 0.2), trimMat);
  doorFrame.position.set(0, 1.25, 4.02);
  house.add(doorFrame);

  // Welcome Mat
  const matMat = new THREE.MeshStandardMaterial({ color: 0x92400e });
  const welcMat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.8), matMat);
  welcMat.position.set(0, 0.02, 4.6);
  house.add(welcMat);

  // Windows
  const winL = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 0.1), glassMaterial);
  winL.position.set(-2.5, 2.2, 4.05);
  house.add(winL);

  const winR = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 0.1), glassMaterial);
  winR.position.set(2.5, 2.2, 4.05);
  house.add(winR);

  // Front Mailbox / House Sign ("MINHA CASA")
  const signPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), trimMat);
  signPole.position.set(4.2, 0.7, 5.8);
  house.add(signPole);

  const signPlateTex = createSignTexture('MINHA CASA', 'RESIDÊNCIA #42', '#0284c7');
  const signPlate = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshBasicMaterial({ map: signPlateTex }));
  signPlate.position.set(4.2, 1.4, 5.8);
  house.add(signPlate);

  return house;
}

// Player's House Interior (Accessible 3D Multi-Room Brazilian Residence)
export function createHouseInteriorRoom(): THREE.Group {
  const room = new THREE.Group();

  const floorMat = new THREE.MeshStandardMaterial({ color: 0x926127, roughness: 0.5 }); // Warm wooden floor
  const tileMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.05 }); // Kitchen/Bathroom polished tile
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 }); // Clean off-white walls
  const accentWallMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.85 }); // Blue accent wall behind TV
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });

  const roomW = 16;
  const roomH = 3.6;
  const roomD = 14;

  // 1. Flooring
  const floorLiving = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.2, roomD), floorMat);
  floorLiving.position.y = -0.1;
  floorLiving.receiveShadow = true;
  room.add(floorLiving);

  // Kitchen/Bathroom tile patch
  const kitchenTile = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.22, 6.2), tileMat);
  kitchenTile.position.set(4.4, -0.09, 3.4);
  kitchenTile.receiveShadow = true;
  room.add(kitchenTile);

  const bathTile = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.22, 5.8), tileMat);
  bathTile.position.set(5.2, -0.09, -3.8);
  bathTile.receiveShadow = true;
  room.add(bathTile);

  // Ceiling
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.2, roomD), ceilingMat);
  ceiling.position.y = roomH + 0.1;
  room.add(ceiling);

  // 2. Outer Perimeter Walls
  // Back Wall (Z = -roomD / 2)
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(roomW, roomH, 0.3), wallMat);
  backWall.position.set(0, roomH / 2, -roomD / 2);
  room.add(backWall);

  // Front Wall (Z = +roomD / 2) with Entrance Doorway at center
  const frontWallL = new THREE.Mesh(new THREE.BoxGeometry((roomW - 2.2) / 2, roomH, 0.3), wallMat);
  frontWallL.position.set(-(roomW + 2.2) / 4, roomH / 2, roomD / 2);
  room.add(frontWallL);

  const frontWallR = new THREE.Mesh(new THREE.BoxGeometry((roomW - 2.2) / 2, roomH, 0.3), wallMat);
  frontWallR.position.set((roomW + 2.2) / 4, roomH / 2, roomD / 2);
  room.add(frontWallR);

  const frontWallTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, roomH - 2.4, 0.3), wallMat);
  frontWallTop.position.set(0, roomH - (roomH - 2.4) / 2, roomD / 2);
  room.add(frontWallTop);

  // Left & Right Walls
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, roomH, roomD), wallMat);
  leftWall.position.set(-roomW / 2, roomH / 2, 0);
  room.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, roomH, roomD), wallMat);
  rightWall.position.set(roomW / 2, roomH / 2, 0);
  room.add(rightWall);

  // 3. Interior Partition Walls
  // Dividing Wall between Front (Living/Kitchen) and Back (Bedroom/Bathroom) along Z = 0.4
  // Leaves a 2.4m central hallway corridor (X between -1.2 and +1.2)
  const partWallLeft = new THREE.Mesh(new THREE.BoxGeometry(6.6, roomH, 0.25), wallMat);
  partWallLeft.position.set(-4.6, roomH / 2, 0.4);
  room.add(partWallLeft);

  const partWallRight = new THREE.Mesh(new THREE.BoxGeometry(6.6, roomH, 0.25), wallMat);
  partWallRight.position.set(4.6, roomH / 2, 0.4);
  room.add(partWallRight);

  // Dividing Wall between Bedroom and Bathroom along X = 2.4 (from Z = 0.4 to Z = -6.8)
  const partWallBath = new THREE.Mesh(new THREE.BoxGeometry(0.25, roomH, 4.6), wallMat);
  partWallBath.position.set(2.4, roomH / 2, -4.2);
  room.add(partWallBath);

  // Bathroom Door Wall (leaves doorway at X = 2.4 to 3.8, Z = -1.2)
  const bathDoorTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, roomH - 2.3, 0.25), wallMat);
  bathDoorTop.position.set(2.4, roomH - (roomH - 2.3) / 2, -1.2);
  room.add(bathDoorTop);

  // 4. SALA DE ESTAR (LIVING ROOM) - Front Left (X: -7 to 0, Z: 0.8 to 6.5)
  // Accent TV Wall panel
  const tvPanel = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.6, 0.08), accentWallMat);
  tvPanel.position.set(-4.5, 1.6, 0.55);
  room.add(tvPanel);

  // Media Rack
  const rack = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.45, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 })
  );
  rack.position.set(-4.5, 0.22, 0.7);
  rack.castShadow = true;
  room.add(rack);

  // 55" Smart TV with glowing display
  const tvFrame = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.25, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.2, metalness: 0.8 })
  );
  tvFrame.position.set(-4.5, 1.6, 0.65);
  room.add(tvFrame);

  const tvScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, 1.15),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
      roughness: 0.1,
    })
  );
  tvScreen.position.set(-4.5, 1.6, 0.7);
  room.add(tvScreen);

  // Console on rack
  const consoleMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.08, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x3b82f6, emissiveIntensity: 0.4 })
  );
  consoleMesh.position.set(-3.5, 0.49, 0.7);
  room.add(consoleMesh);

  // Comfy 3-Seater Sofa facing TV
  const sofaGroup = new THREE.Group();
  sofaGroup.position.set(-4.5, 0, 4.2);
  const sofaMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
  const sofaCushionMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });

  const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.4, 1.1), sofaMat);
  sofaBase.position.y = 0.2;
  sofaGroup.add(sofaBase);

  const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.6, 0.3), sofaMat);
  sofaBack.position.set(0, 0.65, 0.4);
  sofaGroup.add(sofaBack);

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 1.1), sofaMat);
  armL.position.set(-1.4, 0.45, 0);
  sofaGroup.add(armL);

  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 1.1), sofaMat);
  armR.position.set(1.4, 0.45, 0);
  sofaGroup.add(armR);

  // 3 Soft Seat Cushions
  for (let c = -1; c <= 1; c++) {
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.16, 0.8), sofaCushionMat);
    cushion.position.set(c * 0.88, 0.46, -0.08);
    sofaGroup.add(cushion);
  }
  room.add(sofaGroup);

  // Living Room Area Rug
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 2.4),
    new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.95 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(-4.5, 0.015, 2.5);
  room.add(rug);

  // Coffee Table
  const coffeeTable = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.35, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.5 })
  );
  coffeeTable.position.set(-4.5, 0.18, 2.5);
  coffeeTable.castShadow = true;
  room.add(coffeeTable);

  // 5. COZINHA (KITCHEN) - Front Right (X: 1.5 to 7.5, Z: 0.8 to 6.5)
  // Kitchen Counter with Sink and Cabinets
  const counterMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });
  const cabinetMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });

  const kitchenCounter = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.9, 0.75), cabinetMat);
  kitchenCounter.position.set(5.2, 0.45, 6.2);
  room.add(kitchenCounter);

  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.08, 0.8), counterMat);
  counterTop.position.set(5.2, 0.92, 6.2);
  room.add(counterTop);

  // Faucet & Sink
  const sinkBowl = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.05, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 })
  );
  sinkBowl.position.set(5.2, 0.95, 6.2);
  room.add(sinkBowl);

  const faucet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8),
    new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 0.95, roughness: 0.1 })
  );
  faucet.position.set(5.2, 1.12, 6.4);
  room.add(faucet);

  // Stove with 4 Burners
  const stove = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.9, 0.75),
    new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.4, metalness: 0.6 })
  );
  stove.position.set(3.2, 0.45, 6.2);
  room.add(stove);

  // Refrigerator (Geladeira Duplex Inox)
  const fridgeMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.8, roughness: 0.25 });
  const fridge = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.1, 0.9), fridgeMat);
  fridge.position.set(7.2, 1.05, 6.1);
  fridge.castShadow = true;
  room.add(fridge);

  // Fridge handles
  const handleTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.35, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x111827 })
  );
  handleTop.position.set(6.75, 1.45, 5.62);
  room.add(handleTop);

  const handleBottom = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.35, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x111827 })
  );
  handleBottom.position.set(6.75, 0.75, 5.62);
  room.add(handleBottom);

  // American Bar Island with 2 Stools
  const barIsland = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 1.0, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 })
  );
  barIsland.position.set(4.5, 0.5, 3.2);
  barIsland.castShadow = true;
  room.add(barIsland);

  const barTop = new THREE.Mesh(
    new THREE.BoxGeometry(3.0, 0.08, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.4 })
  );
  barTop.position.set(4.5, 1.02, 3.2);
  room.add(barTop);

  // 2 Bar Stools
  for (let s = -1; s <= 1; s += 2) {
    const stoolSeat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.08, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })
    );
    stoolSeat.position.set(4.5 + s * 0.7, 0.7, 2.4);
    room.add(stoolSeat);

    const stoolLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.68, 8),
      new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 0.8 })
    );
    stoolLeg.position.set(4.5 + s * 0.7, 0.34, 2.4);
    room.add(stoolLeg);
  }

  // 6. QUARTO DO JOGADOR (BEDROOM) - Back Left (X: -7.5 to 1.5, Z: -6.5 to 0)
  // Double Bed with Wood Frame, Headboard & Pillows
  const bedGroup = new THREE.Group();
  bedGroup.position.set(-4.5, 0, -4.2);

  const headboard = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 1.3, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.6 })
  );
  headboard.position.set(0, 0.65, -1.5);
  bedGroup.add(headboard);

  const bedFrame = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 0.38, 2.9),
    new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 })
  );
  bedFrame.position.y = 0.19;
  bedGroup.add(bedFrame);

  const mattress = new THREE.Mesh(
    new THREE.BoxGeometry(2.35, 0.35, 2.75),
    new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.8 })
  );
  mattress.position.y = 0.52;
  bedGroup.add(mattress);

  const quilt = new THREE.Mesh(
    new THREE.BoxGeometry(2.36, 0.12, 1.9),
    new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.85 })
  );
  quilt.position.set(0, 0.68, 0.4);
  bedGroup.add(quilt);

  // Pillows
  const pMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const pil1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.55), pMat);
  pil1.position.set(-0.6, 0.74, -1.05);
  bedGroup.add(pil1);

  const pil2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.55), pMat);
  pil2.position.set(0.6, 0.74, -1.05);
  bedGroup.add(pil2);

  // Bedside Nightstand & Lamp
  const nightstand = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.55, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.6 })
  );
  nightstand.position.set(-2.0, 0.28, -1.4);
  bedGroup.add(nightstand);

  const lamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.14, 0.3, 12),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 0.6 })
  );
  lamp.position.set(-2.0, 0.72, -1.4);
  bedGroup.add(lamp);

  const bedLight = new THREE.PointLight(0xffedd5, 1.4, 9);
  bedLight.position.set(-2.0, 1.2, -1.4);
  bedGroup.add(bedLight);

  room.add(bedGroup);

  // Wardrobe (Guarda-roupa espelhado com interação para trocar de roupa)
  const wardrobe = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 2.9, 0.85),
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 })
  );
  wardrobe.position.set(-7.4, 1.45, -1.8);
  wardrobe.rotation.y = Math.PI / 2;
  room.add(wardrobe);

  // Wardrobe Mirror Panel
  const mirror = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 2.3),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.05 })
  );
  mirror.position.set(-6.95, 1.45, -1.8);
  mirror.rotation.y = Math.PI / 2;
  room.add(mirror);

  // Save Desk & Laptop Station (Mesa de Estudos e Progresso)
  const deskGroup = new THREE.Group();
  deskGroup.position.set(0.2, 0, -5.2);

  const deskTable = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.78, 0.85),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 })
  );
  deskTable.position.y = 0.39;
  deskGroup.add(deskTable);

  const laptop = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.04, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x09090b, emissive: 0x38bdf8, emissiveIntensity: 0.6 })
  );
  laptop.position.set(0, 0.81, 0);
  deskGroup.add(laptop);

  const deskChair = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.85, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 })
  );
  deskChair.position.set(0, 0.42, 0.75);
  deskGroup.add(deskChair);

  room.add(deskGroup);

  // 7. BANHEIRO (BATHROOM) - Back Right (X: 2.6 to 7.8, Z: -6.5 to -0.2)
  // Bathroom Vanity & Mirror
  const vanity = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.85, 0.6),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
  );
  vanity.position.set(5.2, 0.42, -1.8);
  room.add(vanity);

  const bathMirror = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x93c5fd, metalness: 0.95, roughness: 0.05 })
  );
  bathMirror.position.set(5.2, 1.7, -1.48);
  bathMirror.rotation.y = Math.PI;
  room.add(bathMirror);

  // Toilet
  const toilet = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.75, 0.7),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
  );
  toilet.position.set(7.2, 0.38, -3.2);
  toilet.rotation.y = -Math.PI / 2;
  room.add(toilet);

  // Glass Shower Box
  const showerGlass = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 1.6), glassMaterial);
  showerGlass.position.set(6.8, 1.2, -5.6);
  room.add(showerGlass);

  // 8. Ceiling Lighting for All Zones
  const livingLight = new THREE.PointLight(0xfff7ed, 1.2, 14);
  livingLight.position.set(-4.5, 3.2, 3.5);
  room.add(livingLight);

  const kitchenLight = new THREE.PointLight(0xffffff, 1.2, 12);
  kitchenLight.position.set(4.5, 3.2, 4.5);
  room.add(kitchenLight);

  const bedroomLight = new THREE.PointLight(0xffedd5, 1.3, 14);
  bedroomLight.position.set(-4.0, 3.2, -3.8);
  room.add(bedroomLight);

  const bathLight = new THREE.PointLight(0xf0fdf4, 0.9, 8);
  bathLight.position.set(5.2, 3.2, -3.5);
  room.add(bathLight);

  return room;
}

// Brazilian Traffic Light (Semáforo com Fases)
export function createTrafficLight(): THREE.Group {
  const lightGroup = new THREE.Group();

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
  const boxMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.6 });

  // Main vertical mast
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 5.2, 8), poleMat);
  pole.position.y = 2.6;
  pole.castShadow = true;
  lightGroup.add(pole);

  // Horizontal cantilever arm
  const arm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.08), poleMat);
  arm.position.set(1.2, 4.9, 0);
  lightGroup.add(arm);

  // Signal Housing box
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.2, 0.3), boxMat);
  box.position.set(2.2, 4.2, 0);
  lightGroup.add(box);

  // Backplate / Visor
  const backplate = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 1.35, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 }) // Yellow backing border
  );
  backplate.position.set(2.2, 4.2, -0.15);
  lightGroup.add(backplate);

  // 3 Lenses: Red (top), Yellow (middle), Green (bottom)
  const redLens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.06, 16),
    new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 1.2 })
  );
  redLens.rotation.x = Math.PI / 2;
  redLens.position.set(2.2, 4.55, 0.16);
  redLens.name = 'redLens';
  lightGroup.add(redLens);

  const yellowLens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.06, 16),
    new THREE.MeshStandardMaterial({ color: 0x451a03, emissive: 0x000000, emissiveIntensity: 0 })
  );
  yellowLens.rotation.x = Math.PI / 2;
  yellowLens.position.set(2.2, 4.2, 0.16);
  yellowLens.name = 'yellowLens';
  lightGroup.add(yellowLens);

  const greenLens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.06, 16),
    new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 1.2 })
  );
  greenLens.rotation.x = Math.PI / 2;
  greenLens.position.set(2.2, 3.85, 0.16);
  greenLens.name = 'greenLens';
  lightGroup.add(greenLens);

  return lightGroup;
}

// Brazilian Stop Sign (Placa de "PARE" Octogonal)
export function createStopSign(): THREE.Group {
  const group = new THREE.Group();

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 8), poleMat);
  pole.position.y = 1.3;
  pole.castShadow = true;
  group.add(pole);

  const signTex = createStopSignTexture();
  const signMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: true });

  const plateFront = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), signMat);
  plateFront.position.set(0, 2.2, 0.04);
  group.add(plateFront);

  const plateBack = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), signMat);
  plateBack.position.set(0, 2.2, -0.04);
  plateBack.rotation.y = Math.PI;
  group.add(plateBack);

  return group;
}

// Brazilian Municipal Bus ("CIRCULAR VILA ESPERANÇA")
export function createBusModel(): THREE.Group {
  const bus = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.4, roughness: 0.4 }); // Sky blue livery
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });

  // Main chassis (11m long x 2.6m wide x 3.2m high)
  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 10.6), bodyMat);
  lowerBody.position.y = 1.0;
  lowerBody.castShadow = true;
  bus.add(lowerBody);

  const upperBody = new THREE.Mesh(new THREE.BoxGeometry(2.55, 1.4, 10.5), whiteMat);
  upperBody.position.y = 2.4;
  bus.add(upperBody);

  // Roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.3, 10.4), whiteMat);
  roof.position.y = 3.25;
  bus.add(roof);

  // Front Windshield
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 0.1), glassMaterial);
  windshield.position.set(0, 2.35, 5.3);
  windshield.rotation.x = -0.15;
  bus.add(windshield);

  // Side Passenger Windows
  const sideGlassL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 8.4), glassMaterial);
  sideGlassL.position.set(-1.29, 2.4, -0.4);
  bus.add(sideGlassL);

  const sideGlassR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 8.4), glassMaterial);
  sideGlassR.position.set(1.29, 2.4, -0.4);
  bus.add(sideGlassR);

  // Route Destination Header ("CIRCULAR - VILA ESPERANÇA")
  const signTex = createSignTexture('CIRCULAR', 'LINHA 101 - VILA ESPERANÇA', '#ea580c');
  const routeSign = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.45), new THREE.MeshBasicMaterial({ map: signTex }));
  routeSign.position.set(0, 3.05, 5.28);
  bus.add(routeSign);

  // Wheels (4 dual wheel sets)
  const wheelPositions = [
    [-1.25, 3.4], [1.25, 3.4],
    [-1.25, -3.4], [1.25, -3.4],
  ];
  wheelPositions.forEach(([wx, wz]) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.35, 16), tireMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.48, wz);
    bus.add(wheel);
  });

  // Headlights & Taillights
  const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffedd5, emissiveIntensity: 1.5 });
  const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.08), hlMat);
  hlL.position.set(-0.9, 0.8, 5.32);
  bus.add(hlL);

  const hlR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.08), hlMat);
  hlR.position.set(0.9, 0.8, 5.32);
  bus.add(hlR);

  const tlMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: 0xdc2626, emissiveIntensity: 1.0 });
  const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.08), tlMat);
  tlL.position.set(-1.0, 0.9, -5.32);
  bus.add(tlL);

  const tlR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.08), tlMat);
  tlR.position.set(1.0, 0.9, -5.32);
  bus.add(tlR);

  return bus;
}

// Brazilian Delivery Motorcycle (Moto com Baú)
export function createMotorcycleModel(color: string = '#ea580c'): THREE.Group {
  const moto = new THREE.Group();

  const colorMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.6 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });

  // Frame / Engine block
  const engine = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.6), chromeMaterial);
  engine.position.set(0, 0.45, 0);
  moto.add(engine);

  // Fuel tank
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.26, 0.65), colorMat);
  tank.position.set(0, 0.76, 0.15);
  moto.add(tank);

  // Seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.7), darkMat);
  seat.position.set(0, 0.72, -0.4);
  moto.add(seat);

  // Handlebars & Fork
  const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), chromeMaterial);
  fork.position.set(0, 0.75, 0.7);
  fork.rotation.x = -0.3;
  moto.add(fork);

  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.05, 0.05), chromeMaterial);
  handle.position.set(0, 1.08, 0.6);
  moto.add(handle);

  // Headlight
  const headlight = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.1, 16),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.5 })
  );
  headlight.rotation.x = Math.PI / 2;
  headlight.position.set(0, 0.95, 0.85);
  moto.add(headlight);

  // Wheels (Front & Back)
  const frontWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.12, 16), tireMaterial);
  frontWheel.rotation.z = Math.PI / 2;
  frontWheel.position.set(0, 0.32, 0.95);
  moto.add(frontWheel);

  const backWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.14, 16), tireMaterial);
  backWheel.rotation.z = Math.PI / 2;
  backWheel.position.set(0, 0.32, -0.85);
  moto.add(backWheel);

  // Baú de Entregas (White Delivery Box)
  const bauMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
  const bau = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.55), bauMat);
  bau.position.set(0, 1.05, -0.8);
  bau.castShadow = true;
  moto.add(bau);

  const bauLogoTex = createSignTexture('FLASH', 'EXPRESS', '#ea580c');
  const bauLogo = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.3), new THREE.MeshBasicMaterial({ map: bauLogoTex }));
  bauLogo.position.set(0, 1.05, -1.08);
  bauLogo.rotation.y = Math.PI;
  moto.add(bauLogo);

  return moto;
}

// AI Traffic Car (Sedan / Hatchback)
export function createTrafficCarModel(colorHex: string = '#64748b'): THREE.Group {
  const car = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.6, roughness: 0.35 });

  // Chassis
  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.6, 4.2), bodyMat);
  lowerBody.position.y = 0.5;
  lowerBody.castShadow = true;
  car.add(lowerBody);

  // Cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.55, 2.2), bodyMat);
  cabin.position.set(0, 1.05, -0.2);
  car.add(cabin);

  // Windshields
  const fw = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.08), glassMaterial);
  fw.position.set(0, 1.02, 0.9);
  fw.rotation.x = -0.35;
  car.add(fw);

  const rw = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.08), glassMaterial);
  rw.position.set(0, 1.02, -1.3);
  rw.rotation.x = 0.35;
  car.add(rw);

  // Wheels
  const wheelPositions = [
    [-0.95, 1.3], [0.95, 1.3],
    [-0.95, -1.3], [0.95, -1.3],
  ];
  wheelPositions.forEach(([wx, wz]) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 16), tireMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.32, wz);
    car.add(wheel);
  });

  // Lights
  const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffedd5, emissiveIntensity: 1.2 });
  const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.05), hlMat);
  hlL.position.set(-0.65, 0.55, 2.12);
  car.add(hlL);

  const hlR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.05), hlMat);
  hlR.position.set(0.65, 0.55, 2.12);
  car.add(hlR);

  const tlMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: 0xdc2626, emissiveIntensity: 1.0 });
  const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.05), tlMat);
  tlL.position.set(-0.65, 0.55, -2.12);
  car.add(tlL);

  const tlR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.05), tlMat);
  tlR.position.set(0.65, 0.55, -2.12);
  car.add(tlR);

  return car;
}

// Urban Park Bench & Green Trash Can
export function createParkBench(): THREE.Group {
  const bench = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });

  // Slats
  for (let i = 0; i < 4; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 0.12), woodMat);
    slat.position.set(0, 0.45, -0.2 + i * 0.14);
    bench.add(slat);
  }

  // Backrest slats
  for (let i = 0; i < 3; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.05), woodMat);
    slat.position.set(0, 0.65 + i * 0.14, -0.28);
    bench.add(slat);
  }

  // Cast iron legs
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.6), ironMat);
  legL.position.set(-0.9, 0.35, 0);
  bench.add(legL);

  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.6), ironMat);
  legR.position.set(0.9, 0.35, 0);
  bench.add(legR);

  return bench;
}

// Brazilian Public Trash Can (Lixeira Urbana Verde)
export function createPublicTrashCan(): THREE.Group {
  const group = new THREE.Group();

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6 });
  const binMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 }); // Green

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8), poleMat);
  pole.position.y = 0.7;
  group.add(pole);

  const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.55, 12), binMat);
  bin.position.set(0, 0.75, 0.2);
  group.add(bin);

  return group;
}

// Concessionária Auto Prime Showroom
export function createDealershipBuilding(): THREE.Group {
  const dealer = new THREE.Group();

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.2 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.1 }); // Polished tile

  // Building Size: 18m x 7m x 14m
  const w = 18;
  const h = 6.5;
  const d = 14;

  // Solid Back & Side Walls
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.4), frameMat);
  back.position.set(0, h / 2, -d / 2);
  dealer.add(back);

  const left = new THREE.Mesh(new THREE.BoxGeometry(0.4, h, d), frameMat);
  left.position.set(-w / 2, h / 2, 0);
  dealer.add(left);

  const right = new THREE.Mesh(new THREE.BoxGeometry(0.4, h, d), frameMat);
  right.position.set(w / 2, h / 2, 0);
  dealer.add(right);

  // Floor
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), floorMat);
  floor.position.y = 0.1;
  dealer.add(floor);

  // Roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4), frameMat);
  roof.position.y = h + 0.25;
  dealer.add(roof);

  // Front Glass Walls (Showroom floor-to-ceiling)
  const frontGlassL = new THREE.Mesh(new THREE.BoxGeometry((w - 4) / 2, h - 1.2, 0.1), glassMaterial);
  frontGlassL.position.set(-(w + 4) / 4, (h - 1.2) / 2 + 0.2, d / 2);
  dealer.add(frontGlassL);

  const frontGlassR = new THREE.Mesh(new THREE.BoxGeometry((w - 4) / 2, h - 1.2, 0.1), glassMaterial);
  frontGlassR.position.set((w + 4) / 4, (h - 1.2) / 2 + 0.2, d / 2);
  dealer.add(frontGlassR);

  // Rotating Display Turntable
  const turnTable = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 2.9, 0.3, 24),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7, roughness: 0.2 })
  );
  turnTable.position.set(0, 0.25, 0);
  dealer.add(turnTable);

  // Signboard
  const signTex = createSignTexture('AUTO PRIME', 'CONCESSIONÁRIA DE VEÍCULOS ZERO KM', '#0369a1');
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.2), new THREE.MeshBasicMaterial({ map: signTex }));
  signMesh.position.set(0, h - 0.4, d / 2 + 0.25);
  dealer.add(signMesh);

  return dealer;
}

// Mercadinho Vila Nova (Supermarket / Grocery store)
export function createMarketBuilding(): THREE.Group {
  const market = new THREE.Group();

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 });
  const greenTrimMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 });

  const w = 12;
  const h = 5;
  const d = 9;

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  body.position.y = h / 2;
  body.castShadow = true;
  market.add(body);

  // Green fascia
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 1.4, 0.4), greenTrimMat);
  fascia.position.set(0, h - 0.7, d / 2 + 0.1);
  market.add(fascia);

  // Sign
  const signTex = createSignTexture('MERCADINHO VILA NOVA', 'BEBIDAS, LANCHES E CONVENIÊNCIA', '#16a34a');
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 2.0), new THREE.MeshBasicMaterial({ map: signTex }));
  signMesh.position.set(0, h - 0.7, d / 2 + 0.32);
  market.add(signMesh);

  // Awning
  const awningMat = new THREE.MeshStandardMaterial({ color: 0x15803d });
  const awning = new THREE.Mesh(new THREE.BoxGeometry(9, 0.15, 1.4), awningMat);
  awning.position.set(0, 3.2, d / 2 + 0.7);
  awning.rotation.x = 0.22;
  market.add(awning);

  // Glass window
  const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(8, 2.5, 0.1), glassMaterial);
  windowMesh.position.set(0, 1.6, d / 2 + 0.05);
  market.add(windowMesh);

  return market;
}

// Street Sign (Placa de Rua Brasileira)
export function createStreetSign(streetName: string): THREE.Group {
  const signGroup = new THREE.Group();

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.0, 8), poleMat);
  pole.position.y = 1.5;
  pole.castShadow = true;
  signGroup.add(pole);

  // Blue Brazilian street plate
  const plateTex = createSignTexture(streetName, 'BAIRRO VILA ESPERANÇA', '#1d4ed8');
  const plateMat = new THREE.MeshBasicMaterial({ map: plateTex });

  const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.45), plateMat);
  plate.position.set(0, 2.8, 0.05);
  signGroup.add(plate);

  const plateBack = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.45), plateMat);
  plateBack.position.set(0, 2.8, -0.05);
  plateBack.rotation.y = Math.PI;
  signGroup.add(plateBack);

  return signGroup;
}

// Bus Stop Shelter (Ponto de Ônibus)
export function createBusStop(): THREE.Group {
  const shelter = new THREE.Group();

  const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7 });

  // Roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 2.0), metalMat);
  roof.position.set(0, 2.6, 0);
  shelter.add(roof);

  // Back Glass panel
  const backGlass = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.4, 0.06), glassMaterial);
  backGlass.position.set(0, 1.3, -0.9);
  shelter.add(backGlass);

  // Pillars
  const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8), metalMat);
  p1.position.set(-1.9, 1.3, -0.9);
  shelter.add(p1);

  const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8), metalMat);
  p2.position.set(1.9, 1.3, -0.9);
  shelter.add(p2);

  // Bench
  const bench = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 0.45), benchMat);
  bench.position.set(0, 0.45, -0.6);
  shelter.add(bench);

  // Sign
  const signTex = createSignTexture('PONTO DE ÔNIBUS', 'LINHAS MUNICIPAIS', '#0284c7');
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.35), new THREE.MeshBasicMaterial({ map: signTex }));
  sign.position.set(0, 2.45, 1.02);
  shelter.add(sign);

  return shelter;
}

// Shopping Center Metrópole
export function createShoppingMall(): THREE.Group {
  const mall = new THREE.Group();

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.3 });
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.8 });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 });

  const w = 24;
  const h = 11;
  const d = 16;

  // Main 2-story building body
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  mall.add(body);

  // Modern glass facade & grand atrium entrance
  const atriumGlass = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 0.2), glassMaterial);
  atriumGlass.position.set(0, 5, d / 2 + 0.1);
  mall.add(atriumGlass);

  // Canopy over entrance
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 3.5), goldTrimMat);
  canopy.position.set(0, 4.2, d / 2 + 1.8);
  canopy.castShadow = true;
  mall.add(canopy);

  // Columns for canopy
  const c1 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 4.2, 8), concreteMat);
  c1.position.set(-7, 2.1, d / 2 + 3.2);
  mall.add(c1);

  const c2 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 4.2, 8), concreteMat);
  c2.position.set(7, 2.1, d / 2 + 3.2);
  mall.add(c2);

  // Grand Sign ("SHOPPING METRÓPOLE")
  const mallSignTex = createSignTexture('SHOPPING METRÓPOLE', 'LOJAS, PRAÇA DE ALIMENTAÇÃO E CINEMA', '#f59e0b');
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 2.4), new THREE.MeshBasicMaterial({ map: mallSignTex }));
  signMesh.position.set(0, h - 1.2, d / 2 + 0.2);
  mall.add(signMesh);

  return mall;
}

// Hospital & Farmácia Central
export function createHospital(): THREE.Group {
  const hosp = new THREE.Group();

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 });
  const redCrossMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: 0xdc2626, emissiveIntensity: 0.6 });

  const w = 18;
  const h = 8;
  const d = 14;

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), whiteMat);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  hosp.add(body);

  // Blue top trim
  const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.8, d + 0.2), blueMat);
  trim.position.set(0, h - 0.4, 0);
  hosp.add(trim);

  // Hospital Cross Symbol (Vertical and Horizontal Bars)
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.4, 0.15), redCrossMat);
  crossV.position.set(0, h - 2.2, d / 2 + 0.1);
  hosp.add(crossV);

  const crossH = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 0.15), redCrossMat);
  crossH.position.set(0, h - 2.2, d / 2 + 0.1);
  hosp.add(crossH);

  // Sign
  const hospSignTex = createSignTexture('HOSPITAL & FARMÁCIA', 'PRONTO ATENDIMENTO 24 HORAS', '#0284c7');
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(12, 1.8), new THREE.MeshBasicMaterial({ map: hospSignTex }));
  sign.position.set(0, 3.8, d / 2 + 0.15);
  hosp.add(sign);

  // Glass emergency entrance
  const entrance = new THREE.Mesh(new THREE.BoxGeometry(6, 2.6, 0.1), glassMaterial);
  entrance.position.set(0, 1.3, d / 2 + 0.05);
  hosp.add(entrance);

  return hosp;
}

// Posto de Combustível Brasil (Gas Station)
export function createGasStation(): THREE.Group {
  const station = new THREE.Group();

  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
  const greenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.5 });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });

  // Large overhead Canopy (16m x 10m x 0.8m)
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(16, 0.8, 10), yellowMat);
  canopy.position.set(0, 4.8, 0);
  canopy.castShadow = true;
  station.add(canopy);

  // Green canopy fascia border
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(16.2, 0.3, 10.2), greenMat);
  fascia.position.set(0, 5.0, 0);
  station.add(fascia);

  // Canopy Pillars (4 steel pillars)
  const pillarCoords = [
    [-6, -3], [6, -3],
    [-6, 3], [6, 3],
  ];
  pillarCoords.forEach(([px, pz]) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 4.8, 12), concreteMat);
    pillar.position.set(px, 2.4, pz);
    pillar.castShadow = true;
    station.add(pillar);
  });

  // Fuel Pump Islands (2 islands with 4 pumps)
  [-3.5, 3.5].forEach((ix) => {
    const island = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 5.0), concreteMat);
    island.position.set(ix, 0.12, 0);
    station.add(island);

    [-1.2, 1.2].forEach((pz) => {
      const pump = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 0.7), darkMat);
      pump.position.set(ix, 0.95, pz);
      pump.castShadow = true;
      station.add(pump);

      // Yellow dispenser display
      const disp = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.75), yellowMat);
      disp.position.set(ix, 1.25, pz);
      station.add(disp);
    });
  });

  // Convenience Store in background
  const shop = new THREE.Mesh(new THREE.BoxGeometry(12, 4, 6), concreteMat);
  shop.position.set(0, 2, -10);
  shop.castShadow = true;
  station.add(shop);

  const shopGlass = new THREE.Mesh(new THREE.BoxGeometry(8, 2.2, 0.1), glassMaterial);
  shopGlass.position.set(0, 1.4, -6.95);
  station.add(shopGlass);

  const shopSignTex = createSignTexture('POSTO BRASIL', 'COMBUSTÍVEIS & CONVENIÊNCIA BR', '#eab308');
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.4), new THREE.MeshBasicMaterial({ map: shopSignTex }));
  sign.position.set(0, 4.8, 5.15);
  station.add(sign);

  return station;
}

// Escola Técnica SENAI Vila Esperança (Campus de Tecnologia & Robótica Industrial)
export function createSenaiCampus(): THREE.Group {
  const campus = new THREE.Group();

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
  const senaiBlueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4, metalness: 0.1 });
  const senaiRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.1,
    metalness: 0.85,
    transparent: true,
    opacity: 0.75,
  });

  const w = 22;
  const h = 9;
  const d = 16;

  // Main Building Block
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), whiteMat);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  campus.add(body);

  // SENAI Blue Top Architectural Parapet
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 1.0, d + 0.2), senaiBlueMat);
  parapet.position.set(0, h - 0.5, 0);
  campus.add(parapet);

  // SENAI Red Accent Ribbon along top
  const redBand = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.25, d + 0.3), senaiRedMat);
  redBand.position.set(0, h - 1.1, 0);
  campus.add(redBand);

  // Large Grand Sign: "SENAI - SERVIÇO NACIONAL DE APRENDIZAGEM INDUSTRIAL"
  const senaiSignTex = createSignTexture('SENAI VILA ESPERANÇA', 'EDUCAÇÃO PROFISSIONAL & TECNOLOGIA', '#1e40af');
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 2.2), new THREE.MeshBasicMaterial({ map: senaiSignTex }));
  signMesh.position.set(0, h - 2.4, d / 2 + 0.15);
  campus.add(signMesh);

  // Modern Glass Facade & Robotics Lab Windows (Floor 2)
  for (let col = -3; col <= 3; col++) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.8, 0.15), glassMat);
    win.position.set(col * 2.8, 5.8, d / 2 + 0.1);
    campus.add(win);
  }

  // Entrance Portico & Modern Canopy
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(8, 0.4, 3.2), senaiBlueMat);
  canopy.position.set(0, 3.8, d / 2 + 1.6);
  canopy.castShadow = true;
  campus.add(canopy);

  // Steel Pillars
  const pL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.8, 8), concreteMat);
  pL.position.set(-3.6, 1.9, d / 2 + 2.8);
  campus.add(pL);

  const pR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.8, 8), concreteMat);
  pR.position.set(3.6, 1.9, d / 2 + 2.8);
  campus.add(pR);

  // Double Glass Entrance Doors
  const doors = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.8, 0.1), glassMat);
  doors.position.set(0, 1.4, d / 2 + 0.05);
  campus.add(doors);

  // Reception Desk & Demonstration Drop-off Pedestal in front
  const pedestal = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.8, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
  );
  pedestal.position.set(2.8, 0.4, d / 2 + 2.0);
  campus.add(pedestal);

  const robotModel = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.8, roughness: 0.2 })
  );
  robotModel.position.set(2.8, 0.95, d / 2 + 2.0);
  campus.add(robotModel);

  return campus;
}


