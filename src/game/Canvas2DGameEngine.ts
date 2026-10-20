import { CharacterConfig, DeliveryMission, InteractionPoint, NPCData } from '../types';
import { CityBuildResult, buildCity } from './cityMap';
import {
  PlayerPhysicsState,
  CarPhysicsState,
  updatePlayerPhysics,
  updateCarPhysics,
  resolveAABBCollision,
} from './physics';
import { soundManager } from '../audio/soundManager';

export interface Canvas2DGameEngineCallbacks {
  onInteractionAvailable: (point: InteractionPoint | null, canEnterCar: boolean, canExitCar: boolean) => void;
  onMissionDelivered: (mission: DeliveryMission) => void;
  onSpeedUpdate: (speedKmH: number) => void;
  onPlayerPositionUpdate: (pos: [number, number, number], rotY: number) => void;
  onCarPositionUpdate: (pos: [number, number, number]) => void;
  onTimeUpdate?: (timeOfDay: number) => void;
  onOpenNpcDialog?: (npc: NPCData) => void;
  onHouseTransition?: (isInside: boolean) => void;
}

export class Canvas2DGameEngine {
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private animFrameId: number | null = null;
  private lastTime: number = performance.now();

  // City & Collisions
  public cityData: CityBuildResult;

  // Physics States
  public playerPhysics: PlayerPhysicsState;
  public carPhysics: CarPhysicsState;
  public isDriving: boolean = false;
  public isInsideHouse: boolean = false;
  private currentActiveMission: DeliveryMission | null = null;

  // Day & Night Cycle
  public timeOfDay: number = 10.5;

  // Visual customizer
  private characterConfig: CharacterConfig;
  private carColor: string;

  // Input states
  public keys: { [key: string]: boolean } = {};
  public isInputBlocked: boolean = false;
  public mouseSensitivity: number = 0.0025;
  public speedMultiplier: number = 1.0;

  // Camera settings
  private camX: number = 0;
  private camZ: number = 0;
  private zoom: number = 13;

  // Callbacks
  private callbacks: Canvas2DGameEngineCallbacks;

  constructor(
    container: HTMLElement,
    characterConfig: CharacterConfig,
    carColor: string,
    initialPos: [number, number, number],
    callbacks: Canvas2DGameEngineCallbacks,
    initialTimeOfDay: number = 10.5,
    isInsideHouseInitial: boolean = false,
    speedMultiplier: number = 1.0
  ) {
    this.container = container;
    this.characterConfig = characterConfig;
    this.carColor = carColor;
    this.callbacks = callbacks;
    this.timeOfDay = initialTimeOfDay;
    this.isInsideHouse = isInsideHouseInitial;
    this.speedMultiplier = speedMultiplier;

    this.playerPhysics = {
      x: initialPos[0],
      y: initialPos[1],
      z: initialPos[2],
      vx: 0,
      vy: 0,
      vz: 0,
      rotationY: 0,
      isGrounded: true,
      radius: 0.42,
    };

    this.carPhysics = {
      x: initialPos[0] + 5,
      y: 0,
      z: initialPos[2] + 4,
      rotationY: 0,
      speed: 0,
      steerAngle: 0,
      radius: 1.35,
    };

    this.camX = initialPos[0];
    this.camZ = initialPos[2];

    this.cityData = buildCity();

    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;

    this.handleResize();
    this.setupListeners();
    this.animate();
  }

  private setupListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', this.handleResize);
  }

  public setCharacterConfig(config: CharacterConfig) {
    this.characterConfig = config;
  }

  public setCarColor(color: string) {
    this.carColor = color;
  }

  public setActiveMission(mission: DeliveryMission | null) {
    this.currentActiveMission = mission;
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.isInputBlocked) return;

    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    this.keys[e.code] = true;

    if (e.code === 'KeyE') {
      this.triggerInteraction();
    }
    if (e.code === 'KeyH' && this.isDriving) {
      soundManager.playHorn();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private handleResize = () => {
    if (!this.container || !this.canvas) return;
    const w = this.container.clientWidth || window.innerWidth || 800;
    const h = this.container.clientHeight || window.innerHeight || 600;
    this.canvas.width = w;
    this.canvas.height = h;
  };

  public triggerInteraction() {
    if (this.isInputBlocked) return;

    if (this.isDriving) {
      this.exitVehicle();
      return;
    }

    const point = this.getNearbyInteractionPoint();
    if (point) {
      if (point.type === 'player_house_door') {
        this.enterHouse();
        return;
      }
      if (point.type === 'player_house_exit') {
        this.exitHouse();
        return;
      }
      if (point.type === 'player_house_bed') {
        soundManager.playCashSound();
        this.timeOfDay = 7.0;
        return;
      }
      if (point.type === 'npc_dialog' && point.extraData?.npcId) {
        const npc = this.cityData.npcs.find((n) => n.id === point.extraData?.npcId);
        if (npc) {
          soundManager.playUiClick();
          this.callbacks.onOpenNpcDialog?.(npc);
          return;
        }
      }
    }

    const carDist = this.getDistanceToCar();
    if (!this.isInsideHouse && carDist < 3.4) {
      this.enterVehicle();
      return;
    }

    if (this.currentActiveMission) {
      const tx = this.currentActiveMission.targetPosition[0];
      const tz = this.currentActiveMission.targetPosition[2];
      const dist = Math.hypot(this.playerPhysics.x - tx, this.playerPhysics.z - tz);
      if (dist < 4.5) {
        soundManager.playMissionComplete();
        const mission = this.currentActiveMission;
        this.setActiveMission(null);
        this.callbacks.onMissionDelivered(mission);
        return;
      }
    }

    if (point) {
      soundManager.playUiClick();
    }
  }

  public enterHouse() {
    this.isInsideHouse = true;
    this.playerPhysics.x = -25;
    this.playerPhysics.y = -40;
    this.playerPhysics.z = -25 + 3.2;
    this.playerPhysics.vx = 0;
    this.playerPhysics.vz = 0;
    soundManager.playUiClick();
    this.callbacks.onHouseTransition?.(true);
  }

  public exitHouse() {
    this.isInsideHouse = false;
    this.playerPhysics.x = -25;
    this.playerPhysics.y = 0;
    this.playerPhysics.z = -25 + 4.8;
    this.playerPhysics.vx = 0;
    this.playerPhysics.vz = 0;
    soundManager.playUiClick();
    this.callbacks.onHouseTransition?.(false);
  }

  public enterVehicle() {
    if (this.isDriving || this.isInsideHouse) return;
    this.isDriving = true;
    soundManager.startEngine();
  }

  public exitVehicle() {
    if (!this.isDriving) return;
    this.isDriving = false;
    const exitAngle = this.carPhysics.rotationY + Math.PI / 2;
    this.playerPhysics.x = this.carPhysics.x + Math.sin(exitAngle) * 1.8;
    this.playerPhysics.z = this.carPhysics.z + Math.cos(exitAngle) * 1.8;
    this.playerPhysics.vx = 0;
    this.playerPhysics.vz = 0;
    soundManager.stopEngine();
    this.callbacks.onSpeedUpdate(0);
  }

  public getDistanceToCar(): number {
    return Math.hypot(this.playerPhysics.x - this.carPhysics.x, this.playerPhysics.z - this.carPhysics.z);
  }

  public getNearbyInteractionPoint(): InteractionPoint | null {
    const px = this.isDriving ? this.carPhysics.x : this.playerPhysics.x;
    const pz = this.isDriving ? this.carPhysics.z : this.playerPhysics.z;

    for (const pt of this.cityData.interactionPoints) {
      if (this.isInsideHouse && pt.position[1] >= -2) continue;
      if (!this.isInsideHouse && pt.position[1] < -2) continue;

      const dist = Math.hypot(px - pt.position[0], pz - pt.position[2]);
      if (dist <= pt.radius) {
        return pt;
      }
    }
    return null;
  }

  private updateNPCs(delta: number) {
    this.cityData.npcs.forEach((npc) => {
      if (!npc.route || npc.route.length === 0) return;
      const target = npc.route[npc.routeIndex];
      const dx = target[0] - npc.position[0];
      const dz = target[1] - npc.position[2];
      const dist = Math.hypot(dx, dz);

      if (dist < 0.4) {
        npc.routeIndex = (npc.routeIndex + 1) % npc.route.length;
      } else {
        const step = Math.min(dist, npc.speed * delta);
        npc.position[0] += (dx / dist) * step;
        npc.position[2] += (dz / dist) * step;
        npc.heading = Math.atan2(dx, dz);

        const intPt = this.cityData.interactionPoints.find((p) => p.id === `npc_talk_${npc.id}`);
        if (intPt) {
          intPt.position[0] = npc.position[0];
          intPt.position[2] = npc.position[2];
        }
      }
    });
  }

  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate);
    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.08);
    this.lastTime = now;

    // Time of day update
    this.timeOfDay = (this.timeOfDay + delta * 0.1) % 24;
    this.callbacks.onTimeUpdate?.(this.timeOfDay);

    const boxes = this.cityData.collisionBoxes;

    // 1. Process Input with fixed WASD for 2D (W is up/-Z, S is down/+Z, A is left/-X, D is right/+X)
    let forwardKey = 0;
    let strafeKey = 0;
    let isRunning = false;
    let isJumping = false;
    let isBraking = false;

    if (!this.isInputBlocked) {
      // In 2D Top-Down: W goes UP (which is -Z in world coords), S goes DOWN (+Z)
      forwardKey = (this.keys['KeyW'] || this.keys['ArrowUp'] ? -1 : 0) + (this.keys['KeyS'] || this.keys['ArrowDown'] ? 1 : 0);
      strafeKey = (this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0) - (this.keys['KeyA'] || this.keys['ArrowLeft'] ? 1 : 0);
      isRunning = !!this.keys['ShiftLeft'] || !!this.keys['ShiftRight'];
      isJumping = !!this.keys['Space'] && !this.isDriving;
      isBraking = !!this.keys['Space'] && this.isDriving;
    }

    // 2. Physics Update
    if (!this.isDriving) {
      const walkSpeed = 5.0;
      const runSpeed = 9.5;
      const targetSpeed = isRunning ? runSpeed : walkSpeed;

      const inputMag = Math.hypot(strafeKey, forwardKey);
      if (inputMag > 0.01) {
        const dirX = strafeKey / inputMag;
        const dirZ = forwardKey / inputMag;

        const desiredAngle = Math.atan2(dirX, dirZ);
        let angleDiff = desiredAngle - this.playerPhysics.rotationY;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        this.playerPhysics.rotationY += angleDiff * Math.min(1, delta * 15);

        this.playerPhysics.vx += (dirX * targetSpeed - this.playerPhysics.vx) * Math.min(1, delta * 12);
        this.playerPhysics.vz += (dirZ * targetSpeed - this.playerPhysics.vz) * Math.min(1, delta * 12);
      } else {
        this.playerPhysics.vx += (0 - this.playerPhysics.vx) * Math.min(1, delta * 14);
        this.playerPhysics.vz += (0 - this.playerPhysics.vz) * Math.min(1, delta * 14);
      }

      this.playerPhysics.x += this.playerPhysics.vx * delta;
      this.playerPhysics.z += this.playerPhysics.vz * delta;

      // Direct AABB Collision Resolution
      if (!this.isInsideHouse) {
        const resolved = resolveAABBCollision(this.playerPhysics.x, this.playerPhysics.z, this.playerPhysics.radius, boxes);
        this.playerPhysics.x = resolved.x;
        this.playerPhysics.z = resolved.z;
      }

      const moveMag = Math.hypot(this.playerPhysics.vx, this.playerPhysics.vz);
      if (this.playerPhysics.isGrounded && moveMag > 1.0) {
        soundManager.playFootstep(isRunning);
      }

      this.callbacks.onPlayerPositionUpdate(
        [this.playerPhysics.x, this.playerPhysics.y, this.playerPhysics.z],
        this.playerPhysics.rotationY
      );
    } else {
      // Car controls
      const throttle = (this.keys['KeyW'] || this.keys['ArrowUp'] ? 1 : 0) - (this.keys['KeyS'] || this.keys['ArrowDown'] ? 1 : 0);
      const steer = -((this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0) - (this.keys['KeyA'] || this.keys['ArrowLeft'] ? 1 : 0));

      const { speedKmH } = updateCarPhysics(
        this.carPhysics,
        {
          throttle,
          steer,
          brake: isBraking,
        },
        delta,
        boxes,
        this.speedMultiplier
      );

      this.playerPhysics.x = this.carPhysics.x;
      this.playerPhysics.z = this.carPhysics.z;

      soundManager.updateEngine(speedKmH, throttle !== 0);
      this.callbacks.onSpeedUpdate(speedKmH);
      this.callbacks.onCarPositionUpdate([this.carPhysics.x, 0, this.carPhysics.z]);
      this.callbacks.onPlayerPositionUpdate([this.carPhysics.x, 0, this.carPhysics.z], this.carPhysics.rotationY);
    }

    // 3. Update NPCs
    this.updateNPCs(delta);

    // 4. Proximity & Interaction Check
    const nearCar = !this.isInsideHouse && this.getDistanceToCar() < 3.4;
    const canEnter = !this.isDriving && nearCar;
    const canExit = this.isDriving;
    const nearbyPt = this.getNearbyInteractionPoint();
    this.callbacks.onInteractionAvailable(nearbyPt, canEnter, canExit);

    // Auto mission drop-off
    if (this.currentActiveMission && !this.isInsideHouse) {
      const tx = this.currentActiveMission.targetPosition[0];
      const tz = this.currentActiveMission.targetPosition[2];
      const px = this.isDriving ? this.carPhysics.x : this.playerPhysics.x;
      const pz = this.isDriving ? this.carPhysics.z : this.playerPhysics.z;
      if (Math.hypot(px - tx, pz - tz) < 4.0) {
        soundManager.playMissionComplete();
        const mission = this.currentActiveMission;
        this.setActiveMission(null);
        this.callbacks.onMissionDelivered(mission);
      }
    }

    // 5. Smooth Camera Follow
    const targetCamX = this.isDriving ? this.carPhysics.x : this.playerPhysics.x;
    const targetCamZ = this.isDriving ? this.carPhysics.z : this.playerPhysics.z;
    this.camX += (targetCamX - this.camX) * Math.min(1, delta * 8);
    this.camZ += (targetCamZ - this.camZ) * Math.min(1, delta * 8);

    const targetZoom = this.isInsideHouse ? 18 : this.isDriving ? 10.5 : 14;
    this.zoom += (targetZoom - this.zoom) * Math.min(1, delta * 4);

    // 6. Render 2D Scene
    this.renderScene(now);
  };

  private renderScene(time: number) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const z = this.zoom;

    const toScreen = (wx: number, wz: number): [number, number] => {
      return [cx + (wx - this.camX) * z, cy + (wz - this.camZ) * z];
    };

    // --- IF INSIDE HOUSE: Render cozy house interior ---
    if (this.isInsideHouse) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      // Room bounds: 12m x 10m around (-25, -25)
      const [rx, rz] = toScreen(-25 - 6, -25 - 5);
      const roomW = 12 * z;
      const roomH = 10 * z;

      // Wooden floor
      ctx.fillStyle = '#996515';
      ctx.fillRect(rx, rz, roomW, roomH);

      // Walls
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 6;
      ctx.strokeRect(rx, rz, roomW, roomH);

      // Bed
      const [bx, bz] = toScreen(-25 - 4.2 - 1.2, -25 - 3.2 - 1.6);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(bx, bz, 2.4 * z, 3.2 * z);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx + 0.3 * z, bz + 0.2 * z, 1.8 * z, 0.7 * z);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('CAMA [E]', bx + 0.5 * z, bz + 2.0 * z);

      // Wardrobe
      const [wx, wz] = toScreen(-25 - 4.2 - 1.2, -25 + 1.5 - 0.5);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(wx, wz, 2.4 * z, 1.0 * z);
      ctx.fillStyle = '#fde047';
      ctx.fillText('GUARDA-ROUPA [E]', wx + 0.2 * z, wz + 0.6 * z);

      // Save Desk
      const [dx, dz] = toScreen(-25 + 4.2 - 1.2, -25 - 3.2 - 0.6);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(dx, dz, 2.4 * z, 1.2 * z);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(dx + 0.9 * z, dz + 0.4 * z, 0.6 * z, 0.4 * z);
      ctx.fillText('SALVAR [E]', dx + 0.5 * z, dz + 0.9 * z);

      // Exit Door
      const [ex, ez] = toScreen(-25 - 1.0, -25 + 5 - 0.3);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(ex, ez, 2.0 * z, 0.6 * z);
      ctx.fillText('SAÍDA [E]', ex + 0.4 * z, ez + 0.4 * z);

      // Draw Player inside house
      const [plSx, plSy] = toScreen(this.playerPhysics.x, this.playerPhysics.z);
      ctx.save();
      ctx.translate(plSx, plSy);
      ctx.rotate(this.playerPhysics.rotationY);

      ctx.fillStyle = this.characterConfig.shoesColor || '#ffffff';
      ctx.fillRect(-0.25 * z, -0.4 * z, 0.16 * z, 0.32 * z);
      ctx.fillRect(0.09 * z, -0.4 * z, 0.16 * z, 0.32 * z);

      ctx.fillStyle = this.characterConfig.topColor || '#2563eb';
      ctx.beginPath();
      ctx.roundRect(-0.35 * z, -0.22 * z, 0.7 * z, 0.44 * z, 0.1 * z);
      ctx.fill();

      ctx.fillStyle = this.characterConfig.skinTone || '#d29b74';
      ctx.beginPath();
      ctx.arc(0, 0.05 * z, 0.24 * z, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = this.characterConfig.hairColor || '#1a1105';
      ctx.beginPath();
      ctx.arc(0, 0, 0.26 * z, Math.PI, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      return;
    }

    // --- OUTDOORS CITY RENDERING ---
    // Ground
    ctx.fillStyle = '#2d5a25';
    ctx.fillRect(0, 0, w, h);

    // Roads & Markings
    const roadWidthM = 14;
    const halfLen = 145;
    const roadCoords = [-100, -50, 0, 50, 100];

    ctx.fillStyle = '#22252a'; // Asphalt
    roadCoords.forEach((rx) => {
      const [p1x, p1y] = toScreen(rx - roadWidthM / 2, -halfLen);
      ctx.fillRect(p1x, p1y, roadWidthM * z, halfLen * 2 * z);
    });
    roadCoords.forEach((rz) => {
      const [p1x, p1y] = toScreen(-halfLen, rz - roadWidthM / 2);
      ctx.fillRect(p1x, p1y, halfLen * 2 * z, roadWidthM * z);
    });

    // Double yellow lines
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([12 * (z / 14), 8 * (z / 14)]);

    roadCoords.forEach((rx) => {
      const [x1, y1] = toScreen(rx - 0.25, -halfLen);
      const [x2, y2] = toScreen(rx - 0.25, halfLen);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      const [x3, y3] = toScreen(rx + 0.25, -halfLen);
      const [x4, y4] = toScreen(rx + 0.25, halfLen);
      ctx.beginPath();
      ctx.moveTo(x3, y3);
      ctx.lineTo(x4, y4);
      ctx.stroke();
    });

    roadCoords.forEach((rz) => {
      const [x1, y1] = toScreen(-halfLen, rz - 0.25);
      const [x2, y2] = toScreen(halfLen, rz - 0.25);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      const [x3, y3] = toScreen(-halfLen, rz + 0.25);
      const [x4, y4] = toScreen(halfLen, rz + 0.25);
      ctx.beginPath();
      ctx.moveTo(x3, y3);
      ctx.lineTo(x4, y4);
      ctx.stroke();
    });

    ctx.setLineDash([]);

    // Central Plaza Fountain
    const [fx, fy] = toScreen(0, 0);
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(fx, fy, 4.5 * z, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(fx, fy, 3.8 * z, 0, Math.PI * 2);
    ctx.fill();

    // Helper: Draw Building 2D
    const drawBuilding2D = (bx: number, bz: number, bw: number, bd: number, color: string, label?: string) => {
      const [sx, sy] = toScreen(bx - bw / 2, bz - bd / 2);
      const widthPx = bw * z;
      const depthPx = bd * z;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(sx + 6, sy + 6, widthPx, depthPx);

      ctx.fillStyle = color;
      ctx.fillRect(sx, sy, widthPx, depthPx);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, widthPx, depthPx);

      if (label) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(9, Math.round(10 * (z / 14)))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(label, sx + widthPx / 2, sy + depthPx / 2 + 3);
      }
    };

    // Buildings & Stores
    drawBuilding2D(-25, -25, 9, 8, '#0284c7', 'MINHA CASA (#42)');
    drawBuilding2D(-25, 25, 14, 12, '#ea580c', 'FLASH EXPRESS');
    drawBuilding2D(25, -25, 10, 8, '#b45309', 'PADARIA PÃO DOURADO');
    drawBuilding2D(-75, -25, 12, 9, '#16a34a', 'MERCADINHO VILA NOVA');
    drawBuilding2D(25, 25, 10, 8, '#0369a1', 'OFICINA AUTO CAR');
    drawBuilding2D(75, 25, 18, 14, '#0f172a', 'CONCESSIONÁRIA AUTO PRIME');
    drawBuilding2D(-75, 25, 10, 8, '#7c3aed', 'BOUTIQUE CARIOCA');

    // Corporate Towers
    drawBuilding2D(75, -25, 18, 18, '#1e293b', 'EDIFÍCIO METRÓPOLE');
    drawBuilding2D(-75, -75, 18, 16, '#3b82f6', 'TORRE HORIZON');
    drawBuilding2D(75, -75, 20, 18, '#334155', 'BANCO NACIONAL');

    // Residential Houses
    const houses = [
      { x: -25, z: 75, name: 'Casa 101' },
      { x: 25, z: 75, name: 'Casa 102' },
      { x: 75, z: 75, name: 'Casa 103' },
      { x: -75, z: 75, name: 'Casa 104' },
      { x: -25, z: -75, name: 'Casa 105' },
    ];
    houses.forEach((h) => {
      drawBuilding2D(h.x, h.z, 9, 8, '#c2410c', h.name);
    });

    // Waypoint Beacon
    if (this.currentActiveMission) {
      const [wx, wz] = this.currentActiveMission.targetPosition;
      const [spx, spy] = toScreen(wx, wz);
      const pulse = Math.sin(time / 200) * 4;

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(spx, spy, (10 + pulse) * (z / 14), 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.beginPath();
      ctx.arc(spx, spy, (7 + pulse * 0.5) * (z / 14), 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ENTREGA AQUI', spx, spy - 16);
    }

    // Draw NPCs
    this.cityData.npcs.forEach((npc) => {
      const [nx, ny] = toScreen(npc.position[0], npc.position[2]);
      ctx.save();
      ctx.translate(nx, ny);
      ctx.rotate(npc.heading);

      ctx.fillStyle = npc.topColor;
      ctx.beginPath();
      ctx.roundRect(-0.35 * z, -0.22 * z, 0.7 * z, 0.44 * z, 0.1 * z);
      ctx.fill();

      ctx.fillStyle = npc.skinTone;
      ctx.beginPath();
      ctx.arc(0, 0.05 * z, 0.22 * z, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(npc.name.split(' ')[0], nx, ny - 10);
    });

    // Draw Car
    const [carSx, carSy] = toScreen(this.carPhysics.x, this.carPhysics.z);
    ctx.save();
    ctx.translate(carSx, carSy);
    ctx.rotate(this.carPhysics.rotationY);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(-1.1 * z, -2.1 * z, 2.2 * z, 4.2 * z);

    // Headlight Beams
    const isNight = this.timeOfDay >= 19.0 || this.timeOfDay < 5.5;
    const beamGrad = ctx.createRadialGradient(0, 2.2 * z, 0.2 * z, 0, 7.5 * z, 4.8 * z);
    beamGrad.addColorStop(0, isNight ? 'rgba(255, 253, 231, 0.7)' : 'rgba(255, 253, 231, 0.35)');
    beamGrad.addColorStop(1, 'rgba(255, 253, 231, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(-0.8 * z, 2.2 * z);
    ctx.lineTo(-2.2 * z, 7.5 * z);
    ctx.lineTo(2.2 * z, 7.5 * z);
    ctx.lineTo(0.8 * z, 2.2 * z);
    ctx.closePath();
    ctx.fill();

    // Wheels
    ctx.fillStyle = '#18181b';
    ctx.fillRect(-1.05 * z, 1.1 * z, 0.22 * z, 0.55 * z);
    ctx.fillRect(0.83 * z, 1.1 * z, 0.22 * z, 0.55 * z);
    ctx.fillRect(-1.05 * z, -1.5 * z, 0.22 * z, 0.55 * z);
    ctx.fillRect(0.83 * z, -1.5 * z, 0.22 * z, 0.55 * z);

    // Body
    ctx.fillStyle = this.carColor || '#2563eb';
    ctx.beginPath();
    ctx.roundRect(-0.95 * z, -2.1 * z, 1.9 * z, 4.2 * z, 0.35 * z);
    ctx.fill();

    // Windshield & Windows
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-0.75 * z, -0.6 * z, 1.5 * z, 1.6 * z);

    // Roof
    ctx.fillStyle = this.carColor || '#2563eb';
    ctx.fillRect(-0.7 * z, -0.9 * z, 1.4 * z, 1.4 * z);

    // Headlights & Taillights
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-0.75 * z, 1.95 * z, 0.35 * z, 0.15 * z);
    ctx.fillRect(0.4 * z, 1.95 * z, 0.35 * z, 0.15 * z);

    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-0.75 * z, -2.1 * z, 0.35 * z, 0.15 * z);
    ctx.fillRect(0.4 * z, -2.1 * z, 0.35 * z, 0.15 * z);

    ctx.restore();

    // Draw Character (if not driving)
    if (!this.isDriving) {
      const [plSx, plSy] = toScreen(this.playerPhysics.x, this.playerPhysics.z);
      ctx.save();
      ctx.translate(plSx, plSy);
      ctx.rotate(this.playerPhysics.rotationY);

      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.55 * z, 0.45 * z, 0, 0, Math.PI * 2);
      ctx.fill();

      const moveMag = Math.hypot(this.playerPhysics.vx, this.playerPhysics.vz);
      const swing = moveMag > 0.5 ? Math.sin(time / 110) * 0.25 * z : 0;

      ctx.fillStyle = this.characterConfig.shoesColor || '#ffffff';
      ctx.fillRect(-0.25 * z, -0.4 * z + swing, 0.16 * z, 0.32 * z);
      ctx.fillRect(0.09 * z, -0.4 * z - swing, 0.16 * z, 0.32 * z);

      ctx.fillStyle = this.characterConfig.topColor || '#2563eb';
      ctx.beginPath();
      ctx.roundRect(-0.35 * z, -0.22 * z, 0.7 * z, 0.44 * z, 0.1 * z);
      ctx.fill();

      if (this.currentActiveMission) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-0.28 * z, -0.48 * z, 0.56 * z, 0.28 * z);
      }

      ctx.fillStyle = this.characterConfig.skinTone || '#d29b74';
      ctx.beginPath();
      ctx.arc(0, 0.05 * z, 0.24 * z, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = this.characterConfig.hairColor || '#1a1105';
      ctx.beginPath();
      ctx.arc(0, 0, 0.26 * z, Math.PI, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Night tint overlay if late evening or night
    if (this.timeOfDay >= 19.5 || this.timeOfDay < 5.0) {
      ctx.fillStyle = 'rgba(9, 13, 22, 0.45)';
      ctx.fillRect(0, 0, w, h);
    } else if (this.timeOfDay >= 17.5 && this.timeOfDay < 19.5) {
      ctx.fillStyle = 'rgba(249, 115, 22, 0.15)';
      ctx.fillRect(0, 0, w, h);
    }
  }

  public dispose() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    soundManager.stopEngine();

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.handleResize);

    if (this.canvas && this.container?.contains(this.canvas)) {
      this.container.removeChild(this.canvas);
    }
  }
}
