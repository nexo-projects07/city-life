import * as THREE from 'three';
import {
  createRoadTexture,
  createSidewalkTexture,
  createGrassTexture,
  createIntersectionRoadTexture,
} from './textures';
import { InteractionPoint, NPCData } from '../types';
export type { InteractionPoint };
import {
  createBuilding,
  createHouse,
  createStreetLight,
  createPalmTree,
  createIpeTree,
  createStore,
  createDeliveryHubBuilding,
  createPlayerHouse,
  createHouseInteriorRoom,
  createDealershipBuilding,
  createMarketBuilding,
  createStreetSign,
  createBusStop,
  createTrafficLight,
  createStopSign,
  createBusModel,
  createMotorcycleModel,
  createTrafficCarModel,
  createParkBench,
  createPublicTrashCan,
} from './models';

export interface CollisionBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface TrafficLightInstance {
  group: THREE.Group;
  orientation: 'ns' | 'ew';
  redLens: THREE.Mesh;
  yellowLens: THREE.Mesh;
  greenLens: THREE.Mesh;
}

export interface TrafficVehicleInstance {
  id: string;
  group: THREE.Group;
  type: 'car' | 'bus' | 'moto';
  speed: number;
  laneAxis: 'x' | 'z';
  fixedCoord: number;
  minBound: number;
  maxBound: number;
  direction: 1 | -1;
  currentCoord: number;
}

export interface CityBuildResult {
  group: THREE.Group;
  collisionBoxes: CollisionBox[];
  houseInteriorBoxes: CollisionBox[];
  interactionPoints: InteractionPoint[];
  deliveryDestinations: Array<{ name: string; position: [number, number, number]; clientName: string }>;
  streetLampGlows: THREE.Mesh[];
  npcs: NPCData[];
  houseInteriorGroup: THREE.Group;
  trafficLights: TrafficLightInstance[];
  trafficVehicles: TrafficVehicleInstance[];
}

export function buildCity(renderer?: THREE.WebGLRenderer): CityBuildResult {
  const cityGroup = new THREE.Group();
  const collisionBoxes: CollisionBox[] = [];
  const houseInteriorBoxes: CollisionBox[] = [];
  const interactionPoints: InteractionPoint[] = [];
  const streetLampGlows: THREE.Mesh[] = [];
  const trafficLights: TrafficLightInstance[] = [];
  const trafficVehicles: TrafficVehicleInstance[] = [];

  const halfSize = 150;

  // 1. Terrain Base (Grass/Ground)
  const grassTex = createGrassTexture();
  const groundMat = new THREE.MeshStandardMaterial({
    map: grassTex,
    roughness: 0.9,
    metalness: 0.05,
  });
  const groundGeo = new THREE.PlaneGeometry(360, 360);
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  cityGroup.add(groundMesh);

  // 2. Road Network & Sidewalks (Zero Z-Fighting, Non-Overlapping Intersections)
  const roadTex = createRoadTexture(renderer);
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.7,
    metalness: 0.1,
  });

  const interTex = createIntersectionRoadTexture(renderer);
  const interMat = new THREE.MeshStandardMaterial({
    map: interTex,
    roughness: 0.7,
    metalness: 0.1,
  });

  const sidewalkTex = createSidewalkTexture(renderer);
  const sidewalkMat = new THREE.MeshStandardMaterial({
    map: sidewalkTex,
    roughness: 0.8,
  });

  const crosswalkMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.4,
  });

  // Road grid dimensions
  const roadWidth = 14;
  const sidewalkWidth = 3.6;
  const curbHeight = 0.16;
  const roadCoords = [-100, -50, 0, 50, 100];

  // A. Create Intersections at every (rx, rz)
  roadCoords.forEach((rx) => {
    roadCoords.forEach((rz) => {
      const interGeo = new THREE.PlaneGeometry(roadWidth, roadWidth);
      const interMesh = new THREE.Mesh(interGeo, interMat);
      interMesh.rotation.x = -Math.PI / 2;
      interMesh.position.set(rx, 0.02, rz);
      interMesh.receiveShadow = true;
      cityGroup.add(interMesh);
    });
  });

  // B. Create Road Segments between intersections (disjoint, continuous asphalt)
  // For each adjacent pair in roadCoords: length is (50 - roadWidth) = 36m
  for (let i = 0; i < roadCoords.length - 1; i++) {
    const c1 = roadCoords[i];
    const c2 = roadCoords[i + 1];
    const segCenter = (c1 + c2) / 2;
    const segLen = c2 - c1 - roadWidth; // 36m

    // Vertical segments (N-S avenues) at every X in roadCoords
    roadCoords.forEach((rx) => {
      const segGeo = new THREE.PlaneGeometry(roadWidth, segLen);
      const segMesh = new THREE.Mesh(segGeo, roadMat);
      segMesh.rotation.x = -Math.PI / 2;
      segMesh.position.set(rx, 0.02, segCenter);
      segMesh.receiveShadow = true;
      cityGroup.add(segMesh);

      // Flanking Sidewalks along this vertical segment
      const swGeo = new THREE.BoxGeometry(sidewalkWidth, curbHeight, segLen);
      const swLeft = new THREE.Mesh(swGeo, sidewalkMat);
      swLeft.position.set(rx - roadWidth / 2 - sidewalkWidth / 2, curbHeight / 2, segCenter);
      swLeft.receiveShadow = true;
      cityGroup.add(swLeft);

      const swRight = new THREE.Mesh(swGeo, sidewalkMat);
      swRight.position.set(rx + roadWidth / 2 + sidewalkWidth / 2, curbHeight / 2, segCenter);
      swRight.receiveShadow = true;
      cityGroup.add(swRight);
    });

    // Horizontal segments (E-W streets) at every Z in roadCoords
    roadCoords.forEach((rz) => {
      const segGeo = new THREE.PlaneGeometry(segLen, roadWidth);
      const segMesh = new THREE.Mesh(segGeo, roadMat);
      segMesh.rotation.x = -Math.PI / 2;
      segMesh.position.set(segCenter, 0.02, rz);
      segMesh.receiveShadow = true;
      cityGroup.add(segMesh);

      // Flanking Sidewalks along this horizontal segment
      const swGeo = new THREE.BoxGeometry(segLen, curbHeight, sidewalkWidth);
      const swTop = new THREE.Mesh(swGeo, sidewalkMat);
      swTop.position.set(segCenter, curbHeight / 2, rz - roadWidth / 2 - sidewalkWidth / 2);
      swTop.receiveShadow = true;
      cityGroup.add(swTop);

      const swBottom = new THREE.Mesh(swGeo, sidewalkMat);
      swBottom.position.set(segCenter, curbHeight / 2, rz + roadWidth / 2 + sidewalkWidth / 2);
      swBottom.receiveShadow = true;
      cityGroup.add(swBottom);
    });
  }

  // C. Crosswalks around Intersections
  const addCrosswalk = (cx: number, cz: number, isVertical: boolean) => {
    const cw = isVertical ? 3.8 : 9.5;
    const cl = isVertical ? 9.5 : 3.8;
    const stripeCount = 6;
    for (let i = 0; i < stripeCount; i++) {
      const stripeW = isVertical ? cw : 0.65;
      const stripeL = isVertical ? 0.65 : cl;
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(stripeW, stripeL), crosswalkMat);
      stripe.rotation.x = -Math.PI / 2;
      const offset = (i - stripeCount / 2 + 0.5) * 1.35;
      if (isVertical) {
        stripe.position.set(cx, 0.028, cz + offset);
      } else {
        stripe.position.set(cx + offset, 0.028, cz);
      }
      cityGroup.add(stripe);
    }
  };

  roadCoords.forEach((x) => {
    roadCoords.forEach((z) => {
      addCrosswalk(x, z - 8.8, false);
      addCrosswalk(x, z + 8.8, false);
      addCrosswalk(x - 8.8, z, true);
      addCrosswalk(x + 8.8, z, true);
    });
  });

  // Helper for accurate collision boxes
  const addAABB = (x: number, z: number, w: number, d: number) => {
    const margin = 0.08;
    collisionBoxes.push({
      minX: x - w / 2 - margin,
      maxX: x + w / 2 + margin,
      minZ: z - d / 2 - margin,
      maxZ: z + d / 2 + margin,
    });
  };

  // 3. Central Plaza / Praça da República (Center block: X [-17, 17], Z [-17, 17])
  const parkGeo = new THREE.BoxGeometry(33, 0.2, 33);
  const parkMat = new THREE.MeshStandardMaterial({ color: 0x2e6930, roughness: 0.85 });
  const parkMesh = new THREE.Mesh(parkGeo, parkMat);
  parkMesh.position.set(0, 0.1, 0);
  parkMesh.receiveShadow = true;
  cityGroup.add(parkMesh);

  // Plaza fountain / core monument in center of park
  const fountainBase = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 4.5, 0.9, 20),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 })
  );
  fountainBase.position.set(0, 0.55, 0);
  fountainBase.castShadow = true;
  cityGroup.add(fountainBase);
  addAABB(0, 0, 8.4, 8.4);

  const fountainWater = new THREE.Mesh(
    new THREE.CylinderGeometry(3.9, 3.9, 0.1, 20),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.2 })
  );
  fountainWater.position.set(0, 0.95, 0);
  cityGroup.add(fountainWater);

  // Park palm trees & benches
  const parkTreePositions: [number, number][] = [
    [-11, -11], [11, -11], [-11, 11], [11, 11],
    [0, -12], [0, 12], [-12, 0], [12, 0],
  ];
  parkTreePositions.forEach(([tx, tz]) => {
    const tree = createPalmTree();
    tree.position.set(tx, 0.2, tz);
    cityGroup.add(tree);
    addAABB(tx, tz, 0.8, 0.8);
  });

  // Park Benches & Trash Cans
  const benchPositions: [number, number, number][] = [
    [-6, -6, 0], [6, -6, 0],
    [-6, 6, Math.PI], [6, 6, Math.PI],
  ];
  benchPositions.forEach(([bx, bz, rot]) => {
    const bench = createParkBench();
    bench.position.set(bx, 0.2, bz);
    bench.rotation.y = rot;
    cityGroup.add(bench);
    addAABB(bx, bz, 2.2, 0.8);
  });

  const trashPositions: [number, number][] = [
    [-8, -8], [8, -8], [-8, 8], [8, 8]
  ];
  trashPositions.forEach(([tx, tz]) => {
    const bin = createPublicTrashCan();
    bin.position.set(tx, 0.2, tz);
    cityGroup.add(bin);
  });

  // 4. CASA DO JOGADOR ("MINHA CASA" at X = -25, Z = -25)
  const playerHouseX = -25;
  const playerHouseZ = -25;
  const pHouse = createPlayerHouse();
  pHouse.position.set(playerHouseX, 0, playerHouseZ);
  cityGroup.add(pHouse);
  addAABB(playerHouseX, playerHouseZ, 9.2, 8.2);

  // Player House Door Interaction Point
  interactionPoints.push({
    id: 'house_door_enter',
    name: 'Entrada de Minha Casa',
    type: 'player_house_door',
    position: [playerHouseX, 0, playerHouseZ + 4.8],
    radius: 2.8,
    promptText: '[E] Entrar em Minha Casa',
  });

  // 5. Accessible Multi-Room House Interior Zone (Located at Y = -40 for seamless performance)
  const interiorX = -25;
  const interiorY = -40;
  const interiorZ = -25;
  const houseInterior = createHouseInteriorRoom();
  houseInterior.position.set(interiorX, interiorY, interiorZ);
  cityGroup.add(houseInterior);

  // Interior Interactions
  interactionPoints.push({
    id: 'house_door_exit',
    name: 'Porta de Saída para a Rua',
    type: 'player_house_exit',
    position: [interiorX, interiorY, interiorZ + 6.2],
    radius: 2.5,
    promptText: '[E] Sair para a Rua',
  });

  interactionPoints.push({
    id: 'house_bed',
    name: 'Cama de Casal',
    type: 'player_house_bed',
    position: [interiorX - 4.5, interiorY, interiorZ - 4.2],
    radius: 2.6,
    promptText: '[E] Dormir / Descansar (100% Energia & 07:00 AM)',
  });

  interactionPoints.push({
    id: 'house_wardrobe',
    name: 'Guarda-Roupa Espelhado',
    type: 'player_house_wardrobe',
    position: [interiorX - 6.8, interiorY, interiorZ - 1.8],
    radius: 2.6,
    promptText: '[E] Abrir Guarda-Roupa (Trocar Roupas e Estilo)',
  });

  interactionPoints.push({
    id: 'house_fridge',
    name: 'Geladeira Duplex Inox',
    type: 'player_house_fridge',
    position: [interiorX + 6.6, interiorY, interiorZ + 5.8],
    radius: 2.5,
    promptText: '[E] Pegar Lanche na Geladeira (+25 Energia)',
  });

  interactionPoints.push({
    id: 'house_sofa',
    name: 'Sofá Confortável da Sala',
    type: 'player_house_sofa',
    position: [interiorX - 4.5, interiorY, interiorZ + 3.8],
    radius: 2.5,
    promptText: '[E] Relaxar no Sofá da Sala',
  });

  interactionPoints.push({
    id: 'house_save_station',
    name: 'Notebook de Salvamento',
    type: 'player_house_save_station',
    position: [interiorX + 0.2, interiorY, interiorZ - 4.8],
    radius: 2.5,
    promptText: '[E] Salvar Jogo no Notebook',
  });

  // House Interior Accurate Collision Boxes (Player can walk through rooms and doorways)
  const addInteriorBox = (rx: number, rz: number, w: number, d: number) => {
    houseInteriorBoxes.push({
      minX: interiorX + rx - w / 2,
      maxX: interiorX + rx + w / 2,
      minZ: interiorZ + rz - d / 2,
      maxZ: interiorZ + rz + d / 2,
    });
  };

  // Outer walls
  addInteriorBox(0, -6.9, 16.0, 0.4); // Back wall
  addInteriorBox(-4.6, 6.9, 6.8, 0.4); // Front wall left
  addInteriorBox(4.6, 6.9, 6.8, 0.4);  // Front wall right (center doorway X: -1.2 to 1.2 open)
  addInteriorBox(-7.9, 0, 0.4, 14.0);  // Left wall
  addInteriorBox(7.9, 0, 0.4, 14.0);   // Right wall

  // Partition walls
  addInteriorBox(-4.6, 0.4, 6.6, 0.3); // Dividing wall left (doorway open)
  addInteriorBox(4.6, 0.4, 6.6, 0.3);  // Dividing wall right
  addInteriorBox(2.4, -4.2, 0.3, 4.6); // Bathroom partition wall

  // Furniture Colliders
  addInteriorBox(-4.5, -4.2, 2.6, 3.0); // Bed
  addInteriorBox(-7.4, -1.8, 1.0, 2.8); // Wardrobe
  addInteriorBox(-4.5, 4.2, 3.0, 1.1);  // Sofa
  addInteriorBox(-4.5, 0.7, 3.2, 0.6);  // TV Rack
  addInteriorBox(-4.5, 2.5, 1.4, 0.8);  // Coffee Table
  addInteriorBox(5.2, 6.2, 4.2, 0.8);   // Kitchen Counter
  addInteriorBox(7.2, 6.1, 1.0, 1.0);   // Fridge
  addInteriorBox(4.5, 3.2, 2.8, 0.8);   // Bar Island
  addInteriorBox(0.2, -5.2, 1.8, 0.9);  // Desk
  addInteriorBox(5.2, -1.8, 1.4, 0.6);  // Vanity
  addInteriorBox(7.2, -3.2, 0.6, 0.8);  // Toilet
  addInteriorBox(6.8, -5.6, 1.6, 1.6);  // Shower

  // 6. FLASH EXPRESS - Central de Entregas (at X = -25, Z = 25)
  const hubX = -25;
  const hubZ = 25;
  const hub = createDeliveryHubBuilding();
  hub.position.set(hubX, 0, hubZ);
  hub.rotation.y = Math.PI;
  cityGroup.add(hub);
  addAABB(hubX, hubZ, 14.2, 12.2);

  interactionPoints.push({
    id: 'hub_delivery',
    name: 'Flash Express - Central de Entregas',
    type: 'delivery_hub',
    position: [hubX, 0, hubZ - 8.2],
    radius: 3.5,
    promptText: '[E] Falar com Tiago (Pegar Encomenda)',
  });

  // 7. PADARIA PÃO DOURADO (at X = 25, Z = -25)
  const padariaX = 25;
  const padariaZ = -25;
  const padaria = createStore('PADARIA PÃO DOURADO', 'CAFÉ, PÃO DE QUEIJO E LANCHES', '#b45309');
  padaria.position.set(padariaX, 0, padariaZ);
  cityGroup.add(padaria);
  addAABB(padariaX, padariaZ, 10.2, 8.2);

  interactionPoints.push({
    id: 'store_padaria',
    name: 'Padaria Pão Dourado',
    type: 'store_padaria',
    position: [padariaX, 0, padariaZ + 5.2],
    radius: 3.2,
    promptText: '[E] Comprar Lanches na Padaria',
  });

  // 8. MERCADINHO VILA NOVA (at X = -75, Z = -25)
  const mercadoX = -75;
  const mercadoZ = -25;
  const mercado = createMarketBuilding();
  mercado.position.set(mercadoX, 0, mercadoZ);
  cityGroup.add(mercado);
  addAABB(mercadoX, mercadoZ, 12.2, 9.2);

  interactionPoints.push({
    id: 'store_mercado',
    name: 'Mercadinho Vila Nova',
    type: 'store_mercado',
    position: [mercadoX, 0, mercadoZ + 5.2],
    radius: 3.2,
    promptText: '[E] Comprar Suprimentos no Mercadinho',
  });

  // 9. OFICINA MECÂNICA AUTO CAR (at X = 25, Z = 25)
  const oficinaX = 25;
  const oficinaZ = 25;
  const oficina = createStore('OFICINA AUTO CAR', 'PINTURA, TUNING E REPARO', '#0369a1', true);
  oficina.position.set(oficinaX, 0, oficinaZ);
  cityGroup.add(oficina);
  addAABB(oficinaX, oficinaZ, 10.2, 8.2);

  interactionPoints.push({
    id: 'store_oficina',
    name: 'Oficina Mecânica Auto Car',
    type: 'store_oficina',
    position: [oficinaX, 0, oficinaZ + 5.2],
    radius: 3.5,
    promptText: '[E] Customizar / Pintar Carro',
  });

  // 10. CONCESSIONÁRIA AUTO PRIME (at X = 75, Z = 25)
  const dealerX = 75;
  const dealerZ = 25;
  const dealership = createDealershipBuilding();
  dealership.position.set(dealerX, 0, dealerZ);
  cityGroup.add(dealership);
  addAABB(dealerX, dealerZ, 18.2, 14.2);

  interactionPoints.push({
    id: 'store_concessionaria',
    name: 'Concessionária Auto Prime',
    type: 'store_concessionaria',
    position: [dealerX, 0, dealerZ + 7.5],
    radius: 4.0,
    promptText: '[E] Ver Carros na Auto Prime',
  });

  // 11. BOUTIQUE ESTILO CARIOCA (at X = -75, Z = 25)
  const boutiqueX = -75;
  const boutiqueZ = 25;
  const boutique = createStore('ESTILO CARIOCA', 'MODA URBANA E ROUPAS', '#7c3aed');
  boutique.position.set(boutiqueX, 0, boutiqueZ);
  cityGroup.add(boutique);
  addAABB(boutiqueX, boutiqueZ, 10.2, 8.2);

  interactionPoints.push({
    id: 'store_roupas',
    name: 'Boutique Estilo Carioca',
    type: 'store_roupas',
    position: [boutiqueX, 0, boutiqueZ + 5.2],
    radius: 3.2,
    promptText: '[E] Comprar Roupas na Boutique',
  });

  // 12. Corporate Downtown Towers
  const towers = [
    { x: 75, z: -25, w: 18, h: 32, d: 18, c: 0x1e293b, ac: 0x38bdf8, name: 'Edifício Metrópole' },
    { x: -75, z: -75, w: 18, h: 26, d: 16, c: 0x3b82f6, ac: 0x1d4ed8, name: 'Torre Horizon' },
    { x: 75, z: -75, w: 20, h: 28, d: 18, c: 0x334155, ac: 0x0284c7, name: 'Banco Nacional' },
    { x: 25, z: -75, w: 16, h: 22, d: 16, c: 0x475569, ac: 0xf8fafc, name: 'Centro Empresarial Sul' },
  ];

  towers.forEach((t) => {
    const bldg = createBuilding(t.w, t.h, t.d, t.c, t.ac);
    bldg.position.set(t.x, 0, t.z);
    cityGroup.add(bldg);
    addAABB(t.x, t.z, t.w, t.d);
  });

  // 13. Residential Neighborhood (Vila das Flores)
  const houses = [
    { x: -25, z: 75, color: 0xfae8b4, roof: 0xc2410c, name: 'Casa 101 - Dona Neusa' },
    { x: 25, z: 75, color: 0xcfe8d5, roof: 0xb45309, name: 'Casa 102 - Seu Jorge' },
    { x: 75, z: 75, color: 0xfef08a, roof: 0xb45309, name: 'Casa 103 - Família Santos' },
    { x: -75, z: 75, color: 0xfce7f3, roof: 0xc2410c, name: 'Casa 104 - Camila & Pedro' },
    { x: -25, z: -75, color: 0xdbeafe, roof: 0x9a3412, name: 'Casa 105 - Dr. Marcos' },
  ];

  houses.forEach((h) => {
    const house = createHouse(h.color, h.roof);
    house.position.set(h.x, 0, h.z);
    cityGroup.add(house);
    addAABB(h.x, h.z, 9.2, 8.2);
  });

  // 14. Brazilian Street Signs, Stop Signs & Bus Stops
  const streetSigns = [
    { name: 'AV. BRASIL', x: 0 - 8, z: -15 },
    { name: 'RUA DAS FLORES', x: -25, z: -8 },
    { name: 'RUA DO CAFÉ', x: 25, z: -8 },
    { name: 'AV. CENTRAL', x: 0 + 8, z: 15 },
    { name: 'RUA DA MODA', x: -75, z: 15 },
  ];
  streetSigns.forEach((s) => {
    const sign = createStreetSign(s.name);
    sign.position.set(s.x, 0.16, s.z);
    cityGroup.add(sign);
    addAABB(s.x, s.z, 0.4, 0.4);
  });

  // Placas de "PARE" (Brazilian Stop Signs)
  const stopSignCoords: [number, number, number][] = [
    [-25, -9, 0], [25, -9, 0],
    [-25, 9, Math.PI], [25, 9, Math.PI],
    [-9, -25, Math.PI / 2], [9, -25, -Math.PI / 2],
  ];
  stopSignCoords.forEach(([sx, sz, rot]) => {
    const stopSign = createStopSign();
    stopSign.position.set(sx, 0.16, sz);
    stopSign.rotation.y = rot;
    cityGroup.add(stopSign);
  });

  // Bus Stops
  const busStops = [
    { x: 0 - 9.5, z: -40, rot: Math.PI / 2 },
    { x: 0 + 9.5, z: 40, rot: -Math.PI / 2 },
  ];
  busStops.forEach((bs) => {
    const shelter = createBusStop();
    shelter.position.set(bs.x, 0.16, bs.z);
    shelter.rotation.y = bs.rot;
    cityGroup.add(shelter);
    addAABB(bs.x, bs.z, 2.2, 4.2);
  });

  // 15. Brazilian Traffic Lights (Semáforos Funcionais) at Central Intersections
  const trafficLightConfigs = [
    { x: -9.5, z: -9.5, rot: 0, orient: 'ns' as const },
    { x: 9.5, z: 9.5, rot: Math.PI, orient: 'ns' as const },
    { x: 9.5, z: -9.5, rot: -Math.PI / 2, orient: 'ew' as const },
    { x: -9.5, z: 9.5, rot: Math.PI / 2, orient: 'ew' as const },
  ];
  trafficLightConfigs.forEach((cfg) => {
    const tl = createTrafficLight();
    tl.position.set(cfg.x, 0.16, cfg.z);
    tl.rotation.y = cfg.rot;
    cityGroup.add(tl);
    addAABB(cfg.x, cfg.z, 0.4, 0.4);

    const redLens = tl.getObjectByName('redLens') as THREE.Mesh;
    const yellowLens = tl.getObjectByName('yellowLens') as THREE.Mesh;
    const greenLens = tl.getObjectByName('greenLens') as THREE.Mesh;
    if (redLens && yellowLens && greenLens) {
      trafficLights.push({
        group: tl,
        orientation: cfg.orient,
        redLens,
        yellowLens,
        greenLens,
      });
    }
  });

  // 16. Streetlights with references for day/night lighting toggle
  const streetlightCoords: [number, number, number][] = [
    [-50 - 9, -25, 0], [-50 + 9, -25, Math.PI],
    [-50 - 9, 25, 0], [-50 + 9, 25, Math.PI],
    [0 - 9, -25, 0], [0 + 9, -25, Math.PI],
    [0 - 9, 25, 0], [0 + 9, 25, Math.PI],
    [50 - 9, -25, 0], [50 + 9, -25, Math.PI],
    [50 - 9, 25, 0], [50 + 9, 25, Math.PI],
    [0 - 9, -75, 0], [0 + 9, -75, Math.PI],
    [0 - 9, 75, 0], [0 + 9, 75, Math.PI],
  ];

  streetlightCoords.forEach(([lx, lz, rotY]) => {
    const stLight = createStreetLight();
    stLight.position.set(lx, 0.16, lz);
    stLight.rotation.y = rotY;
    cityGroup.add(stLight);

    const glow = stLight.children.find((c) => (c as THREE.Mesh).material && ((c as THREE.Mesh).material as THREE.MeshStandardMaterial).emissive);
    if (glow) streetLampGlows.push(glow as THREE.Mesh);

    addAABB(lx, lz, 0.4, 0.4);
  });

  // 17. Street Trees (Palmeiras & Ipês) along sidewalks
  const streetTrees: [number, number, boolean][] = [
    [-9, -40, true], [9, -40, false],
    [-9, 40, false], [9, 40, true],
    [-40, -9, true], [-40, 9, false],
    [40, -9, false], [40, 9, true],
    [-60, 9, true], [60, 9, false],
    [-60, -9, false], [60, -9, true],
  ];
  streetTrees.forEach(([tx, tz, isPalm]) => {
    const tree = isPalm ? createPalmTree() : createIpeTree();
    tree.position.set(tx, 0.16, tz);
    cityGroup.add(tree);
    addAABB(tx, tz, 0.6, 0.6);
  });

  // 18. City Limits Boundary Walls (Mureta de Proteção Urbana)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
  const wallH = 1.4;
  const wallThick = 1.2;

  const nWall = new THREE.Mesh(new THREE.BoxGeometry(304, wallH, wallThick), wallMat);
  nWall.position.set(0, wallH / 2, halfSize);
  cityGroup.add(nWall);
  addAABB(0, halfSize, 304, wallThick);

  const sWall = new THREE.Mesh(new THREE.BoxGeometry(304, wallH, wallThick), wallMat);
  sWall.position.set(0, wallH / 2, -halfSize);
  cityGroup.add(sWall);
  addAABB(0, -halfSize, 304, wallThick);

  const eWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallH, 304), wallMat);
  eWall.position.set(halfSize, wallH / 2, 0);
  cityGroup.add(eWall);
  addAABB(halfSize, 0, wallThick, 304);

  const wWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallH, 304), wallMat);
  wWall.position.set(-halfSize, wallH / 2, 0);
  cityGroup.add(wWall);
  addAABB(-halfSize, 0, wallThick, 304);

  // 19. Autonomous Traffic Vehicles (Trânsito Ativo da Cidade)
  // Municipal Bus along Av. Brasil (North-South, X = 3.5 lane)
  const busMesh = createBusModel();
  cityGroup.add(busMesh);
  trafficVehicles.push({
    id: 'traffic_bus_1',
    group: busMesh,
    type: 'bus',
    speed: 10.0, // ~36 km/h
    laneAxis: 'z',
    fixedCoord: 3.5,
    minBound: -130,
    maxBound: 130,
    direction: 1,
    currentCoord: -80,
  });

  // Delivery Motorcycle along Rua das Flores (East-West, Z = 50 - 3.5 lane)
  const motoMesh = createMotorcycleModel('#ea580c');
  cityGroup.add(motoMesh);
  trafficVehicles.push({
    id: 'traffic_moto_1',
    group: motoMesh,
    type: 'moto',
    speed: 13.5, // ~48 km/h
    laneAxis: 'x',
    fixedCoord: 50 - 3.5,
    minBound: -130,
    maxBound: 130,
    direction: -1,
    currentCoord: 90,
  });

  // Civilian Sedan along Avenue X = -50 (Southbound, lane at X = -50 - 3.5)
  const sedanMesh = createTrafficCarModel('#475569');
  cityGroup.add(sedanMesh);
  trafficVehicles.push({
    id: 'traffic_car_1',
    group: sedanMesh,
    type: 'car',
    speed: 11.5,
    laneAxis: 'z',
    fixedCoord: -50 - 3.5,
    minBound: -130,
    maxBound: 130,
    direction: -1,
    currentCoord: 60,
  });

  // Silver Hatchback along Avenue X = 50 (Northbound, lane at X = 50 + 3.5)
  const hatchMesh = createTrafficCarModel('#94a3b8');
  cityGroup.add(hatchMesh);
  trafficVehicles.push({
    id: 'traffic_car_2',
    group: hatchMesh,
    type: 'car',
    speed: 12.0,
    laneAxis: 'z',
    fixedCoord: 50 + 3.5,
    minBound: -130,
    maxBound: 130,
    direction: 1,
    currentCoord: -30,
  });

  // Delivery destinations for Flash Express Courier
  const deliveryDestinations = [
    { name: 'Minha Casa (#42)', position: [playerHouseX, 0, playerHouseZ + 4] as [number, number, number], clientName: 'Você (Encomenda Pessoal)' },
    { name: 'Casa 101 (Dona Neusa)', position: [-25, 0, 71] as [number, number, number], clientName: 'Dona Neusa' },
    { name: 'Casa 102 (Seu Jorge)', position: [25, 0, 71] as [number, number, number], clientName: 'Seu Jorge' },
    { name: 'Casa 103 (Família Santos)', position: [75, 0, 71] as [number, number, number], clientName: 'Sr. Santos' },
    { name: 'Casa 104 (Camila & Pedro)', position: [-75, 0, 71] as [number, number, number], clientName: 'Camila' },
    { name: 'Casa 105 (Dr. Marcos)', position: [-25, 0, -71] as [number, number, number], clientName: 'Dr. Marcos' },
    { name: 'Edifício Metrópole', position: [75, 0, -15] as [number, number, number], clientName: 'Portaria Metrópole' },
    { name: 'Torre Horizon', position: [-75, 0, 15] as [number, number, number], clientName: 'Recepção Horizon' },
    { name: 'Banco Nacional', position: [75, 0, -65] as [number, number, number], clientName: 'Gerência do Banco' },
    { name: 'Padaria Pão Dourado', position: [25, 0, -19] as [number, number, number], clientName: 'Balcão da Padaria' },
    { name: 'Mercadinho Vila Nova', position: [-75, 0, -19] as [number, number, number], clientName: 'Dona Maria' },
  ];

  // 20. Predefined Interactive NPCs with Sidewalk Routes
  const npcs: NPCData[] = [
    {
      id: 'npc_tiago',
      name: 'Tiago (Gerente Flash Express)',
      role: 'Encarregado de Logística',
      position: [hubX, 0, hubZ - 7.5],
      heading: 0,
      route: [
        [hubX - 2, hubZ - 7.5],
        [hubX + 2, hubZ - 7.5],
      ],
      routeIndex: 0,
      dialog: [
        'Fala parceiro! Pronto para rodar a cidade entregando encomendas?',
        'Temos rotas pagando de R$ 90 a R$ 150 por pacote entregue!',
        'Aperte E no balcão para retirar sua próxima encomenda!',
      ],
      speed: 1.0,
      skinTone: '#b57954',
      hairStyle: 'curto',
      hairColor: '#1a1105',
      topColor: '#ea580c',
      bottomColor: '#1e293b',
    },
    {
      id: 'npc_dona_maria',
      name: 'Dona Maria',
      role: 'Dona do Mercadinho',
      position: [mercadoX, 0, mercadoZ + 4.8],
      heading: Math.PI,
      route: [
        [mercadoX - 1.5, mercadoZ + 4.8],
        [mercadoX + 1.5, mercadoZ + 4.8],
      ],
      routeIndex: 0,
      dialog: [
        'Bom dia, meu jovem! Tudo fresquinho aqui no Mercadinho Vila Nova.',
        'Se bater o cansaço das entregas, leve um energético ou água gelada!',
      ],
      speed: 0.8,
      skinTone: '#ffd1b3',
      hairStyle: 'longo',
      hairColor: '#4a2e18',
      topColor: '#16a34a',
      bottomColor: '#334155',
    },
    {
      id: 'npc_antenor',
      name: 'Seu Antenor',
      role: 'Gerente da Auto Prime',
      position: [dealerX, 0, dealerZ + 6.8],
      heading: Math.PI,
      route: [
        [dealerX - 2, dealerZ + 6.8],
        [dealerX + 2, dealerZ + 6.8],
      ],
      routeIndex: 0,
      dialog: [
        'Seja muito bem-vindo à Auto Prime Veículos!',
        'Aqui você encontra hatches populares, esportivos GT e SUVs novinhos.',
        'Junte dinheiro nas entregas e saia motorizado!',
      ],
      speed: 0.9,
      skinTone: '#d29b74',
      hairStyle: 'degrade',
      hairColor: '#e2e8f0',
      topColor: '#0f172a',
      bottomColor: '#475569',
    },
    {
      id: 'npc_ped_1',
      name: 'Lucas (Morador)',
      role: 'Pedestre',
      position: [-8, 0, -20],
      heading: 0,
      route: [
        [-8, -40], [-8, 10], [-18, 10], [-18, -40]
      ],
      routeIndex: 0,
      dialog: [
        'E aí, beleza? Que dia bonito para caminhar na praça!',
        'Você viu o carro novo na concessionária Auto Prime? Coisa linda.',
      ],
      speed: 2.2,
      skinTone: '#ffd1b3',
      hairStyle: 'dreads',
      hairColor: '#1a1105',
      topColor: '#3b82f6',
      bottomColor: '#0f172a',
    },
    {
      id: 'npc_ped_2',
      name: 'Juliana (Estudante)',
      role: 'Pedestre',
      position: [8, 0, 10],
      heading: Math.PI,
      route: [
        [8, 40], [8, -10], [18, -10], [18, 40]
      ],
      routeIndex: 0,
      dialog: [
        'Oi! O pão de queijo da padaria hoje acabou de sair do forno!',
        'Cuidado com esses motoristas na Avenida Brasil, ninguém dá seta!',
      ],
      speed: 2.4,
      skinTone: '#794b29',
      hairStyle: 'longo',
      hairColor: '#1a1105',
      topColor: '#ec4899',
      bottomColor: '#1e293b',
    },
    {
      id: 'npc_ped_3',
      name: 'Carlos (Entregador)',
      role: 'Motoboy & Parceiro',
      position: [-20, 0, 30],
      heading: 0,
      route: [
        [-20, 30], [-45, 30], [-45, 10], [-20, 10]
      ],
      routeIndex: 0,
      dialog: [
        'E aí, colega de entrega! Se acelerar o passo dá pra tirar uma grana boa hoje!',
        'Não esqueça de descansar na sua casa quando a energia estiver baixa!',
      ],
      speed: 2.5,
      skinTone: '#b57954',
      hairStyle: 'raspado',
      hairColor: '#1a1105',
      topColor: '#f97316',
      bottomColor: '#0284c7',
    },
  ];

  // Add NPC interaction points
  npcs.forEach((npc) => {
    interactionPoints.push({
      id: `npc_talk_${npc.id}`,
      name: npc.name,
      type: 'npc_dialog',
      position: npc.position,
      radius: 2.6,
      promptText: `[E] Conversar com ${npc.name.split(' ')[0]}`,
      extraData: { npcId: npc.id, dialog: npc.dialog, role: npc.role },
    });
  });

  return {
    group: cityGroup,
    collisionBoxes,
    houseInteriorBoxes,
    interactionPoints,
    deliveryDestinations,
    streetLampGlows,
    npcs,
    houseInteriorGroup: houseInterior,
    trafficLights,
    trafficVehicles,
  };
}
