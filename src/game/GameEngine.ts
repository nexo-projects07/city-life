import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CharacterConfig, DeliveryMission, NPCData } from '../types';
import { buildCity, CityBuildResult, InteractionPoint } from './cityMap';
import {
  createCharacterRig,
  CharacterRig,
  createCarRig,
  CarRig,
  createWaypointMarker,
} from './models';
import {
  PlayerPhysicsState,
  CarPhysicsState,
  updatePlayerPhysics,
  updateCarPhysics,
} from './physics';
import { soundManager } from '../audio/soundManager';
import { gamepadManager } from './gamepadManager';

const _vec3 = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();

export type CameraMode = 'pedestrian' | 'car' | 'interior';

export interface GameEngineCallbacks {
  onInteractionAvailable: (point: InteractionPoint | null, canEnterCar: boolean, canExitCar: boolean) => void;
  onMissionDelivered: (mission: DeliveryMission) => void;
  onSpeedUpdate: (speedKmH: number) => void;
  onPlayerPositionUpdate: (pos: [number, number, number], rotY: number) => void;
  onCarPositionUpdate: (pos: [number, number, number]) => void;
  onTimeUpdate?: (timeOfDay: number) => void;
  onOpenNpcDialog?: (npc: NPCData) => void;
  onHouseTransition?: (isInside: boolean) => void;
  onTriggerInteraction?: () => void;
  onNpcHit?: (npc: NPCData) => void;
  onBoardBus?: (stopName: string) => void;
}

export class GameEngine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  private container: HTMLElement;
  private animFrameId: number | null = null;
  private clock: THREE.Clock;

  // City data
  public cityData: CityBuildResult;

  // Player & Car Entities
  private characterRig: CharacterRig | null = null;
  private carRig: CarRig | null = null;
  private waypointGroup: THREE.Group | null = null;

  // NPC Rigs
  private npcRigs: Map<string, { rig: CharacterRig; data: NPCData }> = new Map();

  // Physics States
  public playerPhysics: PlayerPhysicsState;
  public carPhysics: CarPhysicsState;

  // Driving & House State
  public isDriving: boolean = false;
  public isInsideHouse: boolean = false;
  private currentActiveMission: DeliveryMission | null = null;

  // Day & Night Cycle
  public timeOfDay: number = 10.5; // Hours (0 - 24)
  private sunLight: THREE.DirectionalLight | null = null;
  private hemiLight: THREE.HemisphereLight | null = null;

  // Camera settings
  public cameraMode: CameraMode = 'pedestrian';
  public cameraYaw: number = 0;       // horizontal angle
  public cameraPitch: number = 0.28;   // vertical angle
  private isMouseDown: boolean = false;
  private previousMouseX: number = 0;
  private previousMouseY: number = 0;

  public keys: { [key: string]: boolean } = {};
  public isInputBlocked: boolean = false;
  public mouseSensitivity: number = 0.0025;
  public speedMultiplier: number = 1.0;

  // Weather & Environment
  public weather: 'sunny' | 'cloudy' | 'rain' = 'sunny';
  private rainPoints: THREE.Points | null = null;

  // Callbacks to React HUD
  private callbacks: GameEngineCallbacks;

  constructor(
    container: HTMLElement,
    characterConfig: CharacterConfig,
    carColor: string,
    initialPos: [number, number, number],
    callbacks: GameEngineCallbacks,
    initialTimeOfDay: number = 10.5,
    isInsideHouseInitial: boolean = false,
    speedMultiplier: number = 1.0
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.clock = new THREE.Clock();
    this.timeOfDay = initialTimeOfDay;
    this.isInsideHouse = isInsideHouseInitial;
    this.speedMultiplier = speedMultiplier;

    // Initialize Physics
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

    // 1. Scene & Atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7dd3fc); // Tropical Brazilian sky blue
    this.scene.fog = new THREE.FogExp2(0x9bd2eb, 0.006);

    // 2. Camera Setup
    const width = container.clientWidth || window.innerWidth || 800;
    const height = container.clientHeight || window.innerHeight || 600;
    const aspect = width / height;
    this.camera = new THREE.PerspectiveCamera(58, aspect, 0.1, 400);
    this.camera.position.set(initialPos[0], initialPos[1] + 3, initialPos[2] - 5);

    // 3. Renderer with PBR (Defensive Init)
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        powerPreference: 'default',
        antialias: true,
        alpha: false,
        failIfMajorPerformanceCaveat: false,
      });
    } catch {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: 'default',
      });
    }

    this.renderer = renderer;
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    try {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } catch {
      this.renderer.shadowMap.enabled = false;
    }

    container.appendChild(this.renderer.domElement);

    // 4. Studio Environment Reflection (Safe try/catch)
    try {
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    } catch (e) {
      console.warn('RoomEnvironment reflection skipped:', e);
    }

    // 5. Lighting Rig (Day/Night compatible)
    this.hemiLight = new THREE.HemisphereLight(0xfff7ed, 0x38bdf8, 0.65);
    this.hemiLight.position.set(0, 60, 0);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.4);
    this.sunLight.position.set(60, 80, 45);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 260;
    const shadowD = 85;
    this.sunLight.shadow.camera.left = -shadowD;
    this.sunLight.shadow.camera.right = shadowD;
    this.sunLight.shadow.camera.top = shadowD;
    this.sunLight.shadow.camera.bottom = -shadowD;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
    this.scene.add(ambientLight);

    // 6. Build World Geometry
    this.cityData = buildCity(this.renderer);
    this.scene.add(this.cityData.group);

    // 7. Instantiate Player Rig
    this.characterRig = createCharacterRig(characterConfig);
    this.characterRig.group.position.set(this.playerPhysics.x, this.playerPhysics.y, this.playerPhysics.z);
    this.scene.add(this.characterRig.group);

    // 8. Instantiate Car Rig
    this.carRig = createCarRig(carColor);
    this.carRig.group.position.set(this.carPhysics.x, 0, this.carPhysics.z);
    this.scene.add(this.carRig.group);

    // 9. Instantiate NPC 3D Rigs
    this.setupNPCs();

    // 10. Rain Particle System
    const rainCount = 1400;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 50;
      rainPositions[i * 3 + 1] = Math.random() * 24;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.18,
      transparent: true,
      opacity: 0.7,
    });
    this.rainPoints = new THREE.Points(rainGeo, rainMat);
    this.rainPoints.visible = false;
    this.scene.add(this.rainPoints);

    // 11. Listeners & Animation Loop
    this.setupListeners();
    this.updateLighting(0);
    this.animate();
  }

  private setupNPCs() {
    this.cityData.npcs.forEach((npc) => {
      const npcConfig: CharacterConfig = {
        name: npc.name,
        skinTone: npc.skinTone,
        hairStyle: npc.hairStyle,
        hairColor: npc.hairColor,
        topType: 'camiseta',
        topColor: npc.topColor,
        bottomType: 'jeans',
        bottomColor: npc.bottomColor,
        shoesColor: '#ffffff',
      };
      const rig = createCharacterRig(npcConfig);
      rig.group.position.set(npc.position[0], npc.position[1], npc.position[2]);
      rig.group.rotation.y = npc.heading;
      this.scene.add(rig.group);
      this.npcRigs.set(npc.id, { rig, data: npc });
    });
  }

  private setupListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', this.handleResize);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('mousemove', this.handleMouseMove);

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    });

    canvas.addEventListener('webglcontextrestored', () => {
      this.animate();
    });
  }

  public setCharacterConfig(config: CharacterConfig) {
    if (!this.characterRig) return;
    this.scene.remove(this.characterRig.group);
    this.characterRig = createCharacterRig(config);
    this.characterRig.group.position.set(this.playerPhysics.x, this.playerPhysics.y, this.playerPhysics.z);
    this.characterRig.group.rotation.y = this.playerPhysics.rotationY;
    if (this.currentActiveMission) {
      this.characterRig.setBackpackVisible(true);
    }
    this.scene.add(this.characterRig.group);
  }

  public setCarColor(color: string) {
    if (this.carRig) {
      this.carRig.setColor(color);
    }
  }

  private passengerRig: CharacterRig | null = null;

  public setPassengerInCar(config: CharacterConfig | null) {
    if (!this.carRig) return;
    if (this.passengerRig) {
      this.carRig.group.remove(this.passengerRig.group);
      this.passengerRig = null;
    }
    if (config) {
      this.passengerRig = createCharacterRig(config);
      this.passengerRig.group.position.set(0.5, 0.45, -0.15);
      this.passengerRig.group.scale.set(0.85, 0.85, 0.85);
      this.passengerRig.leftLeg.rotation.x = -1.4;
      this.passengerRig.rightLeg.rotation.x = -1.4;
      this.carRig.group.add(this.passengerRig.group);
    }
  }

  public setActiveWaypoint(pos: [number, number, number] | null, color: number = 0x38bdf8) {
    if (this.waypointGroup) {
      this.scene.remove(this.waypointGroup);
      this.waypointGroup = null;
    }
    if (pos) {
      this.waypointGroup = createWaypointMarker(color);
      this.waypointGroup.position.set(pos[0], pos[1], pos[2]);
      this.scene.add(this.waypointGroup);
    }
  }

  public setActiveMission(mission: DeliveryMission | null) {
    this.currentActiveMission = mission;

    if (this.characterRig) {
      this.characterRig.setBackpackVisible(mission !== null);
    }

    if (mission) {
      this.setActiveWaypoint(mission.targetPosition, 0xf59e0b);
    } else {
      this.setActiveWaypoint(null);
    }
  }

  public isPunching: boolean = false;
  private punchTimer: number | null = null;

  public triggerPunch() {
    if (this.isDriving || this.isInsideHouse || this.isInputBlocked) return;
    this.isPunching = true;
    soundManager.playPunch();

    if (this.punchTimer) clearTimeout(this.punchTimer);
    this.punchTimer = window.setTimeout(() => {
      this.isPunching = false;
    }, 280);

    // Hit detection for nearby NPCs (within 2.2m)
    const px = this.playerPhysics.x;
    const pz = this.playerPhysics.z;
    for (const [id, { rig, data }] of this.npcRigs.entries()) {
      const dist = Math.hypot(px - data.position[0], pz - data.position[2]);
      if (dist < 2.2) {
        soundManager.playPunch();
        this.callbacks.onNpcHit?.(data);
        break;
      }
    }
  }

  public setWeather(w: 'sunny' | 'cloudy' | 'rain') {
    this.weather = w;
    if (this.rainPoints) {
      this.rainPoints.visible = w === 'rain';
    }
    if (w === 'rain') {
      soundManager.startRain();
    } else {
      soundManager.stopRain();
    }
    this.updateLighting(0);
  }

  public resetVehicleToRoad() {
    this.carPhysics.x = 0;
    this.carPhysics.z = 10;
    this.carPhysics.speed = 0;
    this.carPhysics.steerAngle = 0;
    this.carPhysics.rotationY = 0;
    if (this.carRig) {
      this.carRig.group.position.set(0, 0, 10);
      this.carRig.group.rotation.y = 0;
    }
    soundManager.playCashSound();
  }

  public resetPlayerToSidewalk() {
    this.playerPhysics.x = 0;
    this.playerPhysics.y = 0;
    this.playerPhysics.z = 0;
    this.playerPhysics.vx = 0;
    this.playerPhysics.vy = 0;
    this.playerPhysics.vz = 0;
    if (this.characterRig) {
      this.characterRig.group.position.set(0, 0, 0);
    }
    soundManager.playCashSound();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.isInputBlocked) return;

    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }

    this.keys[e.code] = true;

    if (e.code === 'KeyE') {
      if (this.callbacks.onTriggerInteraction) {
        this.callbacks.onTriggerInteraction();
      } else {
        this.triggerInteraction();
      }
    }

    if (e.code === 'KeyF' && !this.isDriving) {
      this.triggerPunch();
    }

    if (e.code === 'KeyH' && this.isDriving) {
      soundManager.playHorn();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (this.isInputBlocked) return;
    this.isMouseDown = true;
    this.previousMouseX = e.clientX;
    this.previousMouseY = e.clientY;

    if (this.container && document.pointerLockElement !== this.renderer.domElement) {
      try {
        this.renderer.domElement.requestPointerLock?.();
      } catch {}
    }
  };

  private handleMouseUp = () => {
    this.isMouseDown = false;
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.isInputBlocked) return;

    let movementX = 0;
    let movementY = 0;

    if (document.pointerLockElement === this.renderer.domElement) {
      movementX = e.movementX;
      movementY = e.movementY;
    } else if (this.isMouseDown) {
      movementX = e.clientX - this.previousMouseX;
      movementY = e.clientY - this.previousMouseY;
      this.previousMouseX = e.clientX;
      this.previousMouseY = e.clientY;
    } else {
      return;
    }

    this.cameraYaw -= movementX * this.mouseSensitivity;
    this.cameraPitch -= movementY * this.mouseSensitivity;
    this.cameraPitch = Math.max(-0.15, Math.min(1.3, this.cameraPitch));
  };

  private handleResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  // Day & Night Cycle update (Calibrated timescale: 1s real = 0.012 in-game hours, ~33 mins per day)
  private updateLighting(delta: number) {
    this.timeOfDay = (this.timeOfDay + delta * 0.012) % 24;
    this.callbacks.onTimeUpdate?.(this.timeOfDay);

    const t = this.timeOfDay;
    let sunIntensity = 1.3;
    let skyColor = new THREE.Color(0x7dd3fc); // Daytime sky
    let sunColor = new THREE.Color(0xfffbeb);
    let streetLightsOn = false;

    if (t >= 6.0 && t < 17.5) {
      // Daytime
      sunIntensity = 1.4;
      skyColor.setHex(0x7dd3fc);
      sunColor.setHex(0xfffbeb);
      streetLightsOn = false;
    } else if (t >= 17.5 && t < 19.5) {
      // Sunset (Golden hour)
      const ratio = (t - 17.5) / 2.0;
      sunIntensity = 1.1 - ratio * 0.6;
      skyColor.lerpColors(new THREE.Color(0xfb923c), new THREE.Color(0x1e1b4b), ratio);
      sunColor.setHex(0xf97316);
      streetLightsOn = ratio > 0.4;
    } else if (t >= 19.5 || t < 5.0) {
      // Night
      sunIntensity = 0.22;
      skyColor.setHex(0x090d16);
      sunColor.setHex(0x38bdf8); // Soft moonlight
      streetLightsOn = true;
    } else {
      // Sunrise (5.0 to 6.0)
      const ratio = (t - 5.0) / 1.0;
      sunIntensity = 0.3 + ratio * 1.0;
      skyColor.lerpColors(new THREE.Color(0x1e1b4b), new THREE.Color(0xfbcfe8), ratio);
      streetLightsOn = ratio < 0.6;
    }

    if (this.weather === 'rain') {
      skyColor.setHex(0x334155);
      sunColor.setHex(0x94a3b8);
      sunIntensity *= 0.35;
    } else if (this.weather === 'cloudy') {
      skyColor.lerp(new THREE.Color(0x64748b), 0.55);
      sunIntensity *= 0.65;
    }

    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(skyColor);
    }
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(skyColor);
    }

    if (this.sunLight) {
      this.sunLight.intensity = sunIntensity;
      this.sunLight.color.copy(sunColor);
      // Orbit sun
      const sunAngle = ((t - 6) / 24) * Math.PI * 2;
      this.sunLight.position.set(Math.cos(sunAngle) * 90, Math.max(10, Math.sin(sunAngle) * 90), 40);
    }

    // Toggle streetlight glows
    this.cityData.streetLampGlows.forEach((glow) => {
      const mat = glow.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.emissiveIntensity = streetLightsOn ? 1.8 : 0.05;
      }
    });
  }

  // Trigger Interaction ([E] Key Pressed)
  public triggerInteraction() {
    if (this.isInputBlocked) return;

    // 1. If inside car, exit vehicle
    if (this.isDriving) {
      this.exitVehicle();
      return;
    }

    // 2. Check nearby points of interest
    const point = this.getNearbyInteractionPoint();
    if (point) {
      // Player House Door (Enter)
      if (point.type === 'player_house_door') {
        this.enterHouse();
        return;
      }
      // Player House Door (Exit)
      if (point.type === 'player_house_exit') {
        this.exitHouse();
        return;
      }
      // Player House Bed (Rest)
      if (point.type === 'player_house_bed') {
        soundManager.playCashSound();
        // Advance time to 07:00 AM (Morning)
        this.timeOfDay = 7.0;
        return;
      }
      // NPC Dialog
      if (point.type === 'npc_dialog' && point.extraData?.npcId) {
        const npc = this.cityData.npcs.find((n) => n.id === point.extraData?.npcId);
        if (npc) {
          soundManager.playUiClick();
          this.callbacks.onOpenNpcDialog?.(npc);
          return;
        }
      }
    }

    // 3. Near car -> enter vehicle
    const carDist = this.getDistanceToCar();
    if (!this.isInsideHouse && carDist < 3.4) {
      this.enterVehicle();
      return;
    }

    // 4. Mission drop-off
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
    this.playerPhysics.y = -40; // Interior room altitude
    this.playerPhysics.z = -25 + 3.2;
    this.playerPhysics.vx = 0;
    this.playerPhysics.vz = 0;
    this.cameraPitch = 0.22;
    this.cameraYaw = Math.PI; // Face interior

    // Instantly place camera in interior to avoid jarring lerp from surface
    const camDist = 3.2;
    const camHeight = 1.4 + Math.sin(0.22) * 2.2;
    const camHorizontalDist = Math.cos(0.22) * camDist;
    this.camera.position.set(
      -25 - Math.sin(Math.PI) * camHorizontalDist,
      -40 + camHeight,
      (-25 + 3.2) - Math.cos(Math.PI) * camHorizontalDist
    );
    this.camera.lookAt(-25, -40 + 1.35, -25 + 3.2);

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
    this.cameraPitch = 0.28;
    this.cameraYaw = 0;

    // Instantly place camera outside
    const camDist = 4.4;
    const camHeight = 1.8 + Math.sin(0.28) * 2.2;
    const camHorizontalDist = Math.cos(0.28) * camDist;
    this.camera.position.set(
      -25,
      camHeight,
      (-25 + 4.8) - camHorizontalDist
    );
    this.camera.lookAt(-25, 1.35, -25 + 4.8);

    soundManager.playUiClick();
    this.callbacks.onHouseTransition?.(false);
  }

  public enterVehicle() {
    if (this.isDriving || this.isInsideHouse || !this.carRig) return;
    this.isDriving = true;
    this.cameraMode = 'car';
    if (this.characterRig) {
      this.characterRig.group.visible = false;
    }
    soundManager.startEngine();
  }

  public exitVehicle() {
    if (!this.isDriving || !this.carRig) return;
    this.isDriving = false;
    this.cameraMode = 'pedestrian';

    const exitAngle = this.carPhysics.rotationY + Math.PI / 2;
    this.playerPhysics.x = this.carPhysics.x + Math.sin(exitAngle) * 1.8;
    this.playerPhysics.z = this.carPhysics.z + Math.cos(exitAngle) * 1.8;
    this.playerPhysics.y = 0;
    this.playerPhysics.vx = 0;
    this.playerPhysics.vz = 0;

    if (this.characterRig) {
      this.characterRig.group.visible = true;
      this.characterRig.group.position.set(this.playerPhysics.x, 0, this.playerPhysics.z);
    }
    soundManager.stopEngine();
    this.callbacks.onSpeedUpdate(0);
  }

  public getDistanceToCar(): number {
    return Math.hypot(this.playerPhysics.x - this.carPhysics.x, this.playerPhysics.z - this.carPhysics.z);
  }

  public getNearbyInteractionPoint(): InteractionPoint | null {
    const px = this.isDriving ? this.carPhysics.x : this.playerPhysics.x;
    const py = this.playerPhysics.y;
    const pz = this.isDriving ? this.carPhysics.z : this.playerPhysics.z;

    for (const pt of this.cityData.interactionPoints) {
      // In house interior vs street
      if (this.isInsideHouse && pt.position[1] >= -2) continue;
      if (!this.isInsideHouse && pt.position[1] < -2) continue;

      const dist = Math.hypot(px - pt.position[0], pz - pt.position[2]);
      if (dist <= pt.radius) {
        return pt;
      }
    }
    return null;
  }

  // Update NPC movements each frame
  private updateNPCs(delta: number, time: number) {
    this.npcRigs.forEach(({ rig, data }) => {
      if (!data.route || data.route.length === 0) return;

      const target = data.route[data.routeIndex];
      const dx = target[0] - data.position[0];
      const dz = target[1] - data.position[2];
      const dist = Math.hypot(dx, dz);

      if (dist < 0.4) {
        data.routeIndex = (data.routeIndex + 1) % data.route.length;
      } else {
        const moveStep = Math.min(dist, data.speed * delta);
        data.position[0] += (dx / dist) * moveStep;
        data.position[2] += (dz / dist) * moveStep;

        const targetHeading = Math.atan2(dx, dz);
        data.heading = targetHeading;

        rig.group.position.set(data.position[0], data.position[1], data.position[2]);
        rig.group.rotation.y = targetHeading;
        rig.updateAnimation(data.speed, false, false, time);

        // Update interaction point position
        const intPt = this.cityData.interactionPoints.find((p) => p.id === `npc_talk_${data.id}`);
        if (intPt) {
          intPt.position[0] = data.position[0];
          intPt.position[2] = data.position[2];
        }
      }
    });
  }

  // Update Brazilian Traffic Lights & Autonomous Vehicles (Bus, Moto, Cars)
  private updateTraffic(delta: number, time: number) {
    if (!this.cityData.trafficVehicles) return;

    // Traffic light cycle: 16 second period (8s NS green, 2s NS yellow, 6s NS red / EW green, 2s EW yellow)
    const cycle = (time % 16);
    let nsState: 'green' | 'yellow' | 'red' = 'green';
    let ewState: 'green' | 'yellow' | 'red' = 'red';

    if (cycle < 7.0) {
      nsState = 'green';
      ewState = 'red';
    } else if (cycle < 9.0) {
      nsState = 'yellow';
      ewState = 'red';
    } else if (cycle < 14.5) {
      nsState = 'red';
      ewState = 'green';
    } else {
      nsState = 'red';
      ewState = 'yellow';
    }

    if (this.cityData.trafficLights) {
      this.cityData.trafficLights.forEach((tl) => {
        const state = tl.orientation === 'ns' ? nsState : ewState;
        const redMat = tl.redLens.material as THREE.MeshStandardMaterial;
        const yelMat = tl.yellowLens.material as THREE.MeshStandardMaterial;
        const grnMat = tl.greenLens.material as THREE.MeshStandardMaterial;

        if (redMat) redMat.emissiveIntensity = state === 'red' ? 1.4 : 0.05;
        if (yelMat) yelMat.emissiveIntensity = state === 'yellow' ? 1.4 : 0.05;
        if (grnMat) grnMat.emissiveIntensity = state === 'green' ? 1.4 : 0.05;
      });
    }

    // Update Traffic Vehicles
    const px = this.isDriving ? this.carPhysics.x : this.playerPhysics.x;
    const pz = this.isDriving ? this.carPhysics.z : this.playerPhysics.z;

    this.cityData.trafficVehicles.forEach((veh) => {
      let vx = 0;
      let vz = 0;
      if (veh.laneAxis === 'z') {
        vx = veh.fixedCoord;
        vz = veh.currentCoord;
      } else {
        vx = veh.currentCoord;
        vz = veh.fixedCoord;
      }

      // Check distance to player
      const distToPlayer = Math.hypot(vx - px, vz - pz);
      let targetSpeed = veh.speed;

      // Slow down or stop if player or car is directly ahead in same lane within 9m
      if (distToPlayer < 9.0) {
        targetSpeed = Math.max(0, veh.speed * ((distToPlayer - 4.0) / 5.0));
      }

      // Check traffic light at central crossing
      if (veh.laneAxis === 'z' && Math.abs(vz) < 16 && Math.abs(vz) > 8 && nsState === 'red' && veh.direction * vz < 0) {
        targetSpeed = 0;
      }
      if (veh.laneAxis === 'x' && Math.abs(vx) < 16 && Math.abs(vx) > 8 && ewState === 'red' && veh.direction * vx < 0) {
        targetSpeed = 0;
      }

      veh.currentCoord += veh.direction * targetSpeed * delta;

      // Boundary loop reset
      if (veh.direction === 1 && veh.currentCoord > veh.maxBound) {
        veh.currentCoord = veh.minBound;
      } else if (veh.direction === -1 && veh.currentCoord < veh.minBound) {
        veh.currentCoord = veh.maxBound;
      }

      if (veh.laneAxis === 'z') {
        veh.group.position.set(veh.fixedCoord, 0, veh.currentCoord);
        veh.group.rotation.y = veh.direction === 1 ? 0 : Math.PI;
      } else {
        veh.group.position.set(veh.currentCoord, 0, veh.fixedCoord);
        veh.group.rotation.y = veh.direction === 1 ? Math.PI / 2 : -Math.PI / 2;
      }
    });
  }

  // Main Render Loop
  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.08);
    const time = this.clock.getElapsedTime();
    const boxes = this.cityData.collisionBoxes;

    // 1. Process Input from Keyboard and Gamepad Controller
    const pad = gamepadManager.poll({
      onInteract: () => {
        if (this.callbacks.onTriggerInteraction) {
          this.callbacks.onTriggerInteraction();
        } else {
          this.triggerInteraction();
        }
      },
      onHorn: () => {
        soundManager.playHorn();
      },
    });

    let forwardKey = 0;
    let strafeKey = 0;
    let isRunning = false;
    let isJumping = false;
    let isBraking = false;

    if (!this.isInputBlocked) {
      const kbFwd = (this.keys['KeyW'] || this.keys['ArrowUp'] ? 1 : 0) - (this.keys['KeyS'] || this.keys['ArrowDown'] ? 1 : 0);
      const kbStr = (this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0) - (this.keys['KeyA'] || this.keys['ArrowLeft'] ? 1 : 0);

      forwardKey = Math.abs(pad.moveY) > 0.08 ? pad.moveY : kbFwd;
      strafeKey = Math.abs(pad.moveX) > 0.08 ? pad.moveX : kbStr;
      isRunning = !!this.keys['ShiftLeft'] || !!this.keys['ShiftRight'] || pad.isSprinting;
      isJumping = (!!this.keys['Space'] || pad.isJumping) && !this.isDriving;
      isBraking = (!!this.keys['Space'] || pad.brakeReverse > 0.3) && this.isDriving;

      // Gamepad right analog look
      if (Math.abs(pad.lookX) > 0.05 || Math.abs(pad.lookY) > 0.05) {
        this.cameraYaw -= pad.lookX * 2.4 * delta;
        this.cameraPitch -= pad.lookY * 2.0 * delta;
        this.cameraPitch = Math.max(-0.15, Math.min(1.3, this.cameraPitch));
      }
    }

    // 2. Update Physics
    if (!this.isDriving) {
      updatePlayerPhysics(
        this.playerPhysics,
        {
          forward: forwardKey,
          strafe: strafeKey,
          jump: isJumping,
          run: isRunning,
          cameraAngleY: this.cameraYaw,
        },
        delta,
        this.isInsideHouse ? (this.cityData.houseInteriorBoxes || []) : boxes,
        this.isInsideHouse ? -40 : 0
      );

      const moveMag = Math.hypot(this.playerPhysics.vx, this.playerPhysics.vz);
      if (this.playerPhysics.isGrounded && moveMag > 1.0) {
        soundManager.playFootstep(isRunning);
      }

      if (this.characterRig) {
        this.characterRig.group.position.set(this.playerPhysics.x, this.playerPhysics.y, this.playerPhysics.z);
        this.characterRig.group.rotation.y = this.playerPhysics.rotationY;
        this.characterRig.updateAnimation(moveMag, isRunning, !this.playerPhysics.isGrounded, time, this.isPunching);
      }

      this.callbacks.onPlayerPositionUpdate(
        [this.playerPhysics.x, this.playerPhysics.y, this.playerPhysics.z],
        this.playerPhysics.rotationY
      );
    } else {
      let throttle = forwardKey;
      if (pad.throttle > 0.08) {
        throttle = pad.throttle;
      } else if (pad.brakeReverse > 0.08 && !isBraking) {
        throttle = -pad.brakeReverse;
      }
      const steer = -strafeKey;

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

      if (this.carRig) {
        this.carRig.group.position.set(this.carPhysics.x, 0, this.carPhysics.z);
        this.carRig.group.rotation.y = this.carPhysics.rotationY;
        this.carRig.setSteerAngle(this.carPhysics.steerAngle);
        this.carRig.rollWheels(this.carPhysics.speed * delta);
      }

      this.playerPhysics.x = this.carPhysics.x;
      this.playerPhysics.z = this.carPhysics.z;

      soundManager.updateEngine(speedKmH, throttle !== 0);
      this.callbacks.onSpeedUpdate(speedKmH);
      this.callbacks.onCarPositionUpdate([this.carPhysics.x, 0, this.carPhysics.z]);
      this.callbacks.onPlayerPositionUpdate([this.carPhysics.x, 0, this.carPhysics.z], this.carPhysics.rotationY);
    }

    // 3. Update NPCs, Traffic & Day/Night Cycle
    this.updateNPCs(delta, time);
    this.updateTraffic(delta, time);
    this.updateLighting(delta);

    // 4. Proximity & Interaction Check
    const nearCarDist = this.getDistanceToCar();
    const canEnterCar = !this.isDriving && !this.isInsideHouse && nearCarDist < 3.4;
    const canExitCar = this.isDriving;
    const nearbyPoint = this.getNearbyInteractionPoint();
    this.callbacks.onInteractionAvailable(nearbyPoint, canEnterCar, canExitCar);

    // 5. Animate Active Mission Waypoint
    if (this.waypointGroup && !this.isInsideHouse) {
      this.waypointGroup.rotation.y += delta * 1.5;
      const diamond = this.waypointGroup.getObjectByName('diamondIndicator');
      if (diamond) {
        diamond.position.y = 3.5 + Math.sin(time * 3) * 0.4;
      }

      if (this.currentActiveMission) {
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
    }

    // 6. Camera Choreography
    if (this.cameraMode === 'pedestrian') {
      const camDist = this.isInsideHouse ? 3.2 : 4.4;
      const camHeight = (this.isInsideHouse ? 1.4 : 1.8) + Math.sin(this.cameraPitch) * 2.2;
      const camHorizontalDist = Math.cos(this.cameraPitch) * camDist;

      _desiredCamPos.set(
        this.playerPhysics.x - Math.sin(this.cameraYaw) * camHorizontalDist,
        this.playerPhysics.y + camHeight,
        this.playerPhysics.z - Math.cos(this.cameraYaw) * camHorizontalDist
      );

      _camTarget.set(this.playerPhysics.x, this.playerPhysics.y + 1.35, this.playerPhysics.z);

      this.camera.position.lerp(_desiredCamPos, Math.min(1, delta * 14));
      this.camera.lookAt(_camTarget);
    } else {
      // Car Chase Camera
      const carSpeedRatio = Math.min(1, Math.abs(this.carPhysics.speed) / 25);
      const chaseDist = 6.6 + carSpeedRatio * 1.8;
      const chaseHeight = 2.6 + carSpeedRatio * 0.5;

      const effectiveYaw = this.carPhysics.rotationY + this.cameraYaw;
      _desiredCamPos.set(
        this.carPhysics.x - Math.sin(effectiveYaw) * chaseDist,
        chaseHeight,
        this.carPhysics.z - Math.cos(effectiveYaw) * chaseDist
      );

      _camTarget.set(
        this.carPhysics.x + Math.sin(this.carPhysics.rotationY) * 2,
        1.1,
        this.carPhysics.z + Math.cos(this.carPhysics.rotationY) * 2
      );

      this.camera.position.lerp(_desiredCamPos, Math.min(1, delta * 12));
      this.camera.lookAt(_camTarget);

      const targetFov = 58 + carSpeedRatio * 14;
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, delta * 6);
      this.camera.updateProjectionMatrix();
    }

    // 7. Rain Particle Animation
    if (this.weather === 'rain' && this.rainPoints && !this.isInsideHouse) {
      this.rainPoints.visible = true;
      const targetX = this.isDriving ? this.carPhysics.x : this.playerPhysics.x;
      const targetZ = this.isDriving ? this.carPhysics.z : this.playerPhysics.z;
      this.rainPoints.position.set(targetX, 0, targetZ);

      const posAttr = this.rainPoints.geometry.attributes.position;
      const posArray = posAttr.array as Float32Array;
      for (let i = 1; i < posArray.length; i += 3) {
        posArray[i] -= delta * 36;
        if (posArray[i] < 0) {
          posArray[i] = 22 + Math.random() * 4;
        }
      }
      posAttr.needsUpdate = true;
    } else if (this.rainPoints) {
      this.rainPoints.visible = false;
    }

    // 8. Render Frame
    this.renderer.render(this.scene, this.camera);
  };

  public dispose() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    soundManager.stopEngine();

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.handleResize);

    const canvas = this.renderer?.domElement;
    if (canvas) {
      canvas.removeEventListener('mousedown', this.handleMouseDown);
    }
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('mousemove', this.handleMouseMove);

    try {
      this.renderer?.dispose();
    } catch {}

    if (this.renderer?.domElement && this.container?.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
