export interface CharacterConfig {
  name: string;
  skinTone: string;
  hairStyle: 'curto' | 'degrade' | 'dreads' | 'longo' | 'raspado';
  hairColor: string;
  topType: 'camiseta' | 'regata' | 'jaqueta';
  topColor: string;
  bottomType: 'bermuda' | 'jeans' | 'moletom';
  bottomColor: string;
  shoesColor: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  count: number;
  type: 'food' | 'drink' | 'tool' | 'key' | 'healing';
  effectValue?: number;
  description: string;
}

export interface StoryMission {
  id: string;
  chapter: number;
  title: string;
  description: string;
  objectiveText: string;
  giverName: string;
  targetPosition: [number, number, number];
  targetName: string;
  rewardMoney: number;
  rewardReputation: number;
  isCompleted: boolean;
  type: 'story' | 'delivery' | 'police' | 'side';
}

export interface DeliveryMission {
  id: string;
  title: string;
  clientName: string;
  destinationName: string;
  targetPosition: [number, number, number];
  reward: number;
  timeLimitSeconds?: number;
  itemDescription: string;
}

export type InteractionType =
  | 'delivery_hub'
  | 'store_padaria'
  | 'store_mercado'
  | 'store_oficina'
  | 'store_concessionaria'
  | 'store_roupas'
  | 'store_posto'
  | 'store_hospital'
  | 'store_delegacia'
  | 'delivery_dropoff'
  | 'player_house_door'
  | 'player_house_bed'
  | 'player_house_wardrobe'
  | 'player_house_tv'
  | 'player_house_fridge'
  | 'player_house_sofa'
  | 'player_house_save_station'
  | 'player_house_exit'
  | 'property_purchase'
  | 'npc_dialog'
  | 'beto_companion';

export interface InteractionPoint {
  id: string;
  name: string;
  type: InteractionType;
  position: [number, number, number];
  radius: number;
  promptText: string;
  extraData?: Record<string, unknown>;
}

export interface NPCData {
  id: string;
  name: string;
  role: string;
  position: [number, number, number];
  heading: number;
  route: Array<[number, number]>;
  routeIndex: number;
  dialog: string[];
  speed: number;
  skinTone: string;
  hairStyle: 'curto' | 'degrade' | 'dreads' | 'longo' | 'raspado';
  hairColor: string;
  topColor: string;
  bottomColor: string;
  isHostile?: boolean;
  health?: number;
}

export interface TrafficVehicleData {
  id: string;
  type: 'car' | 'bus' | 'moto' | 'police';
  color: string;
  position: [number, number, number];
  heading: number;
  speed: number;
  routeAxis: 'x' | 'z';
  coordFixed: number;
  direction: 1 | -1;
  minBound: number;
  maxBound: number;
}

export type StoreCategory =
  | 'padaria'
  | 'mercado'
  | 'roupas'
  | 'oficina'
  | 'concessionaria'
  | 'posto'
  | 'hospital'
  | 'delegacia';

export interface StoreItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category: StoreCategory;
  effectType?: 'energy' | 'custom_color' | 'car_repair' | 'car_tuning' | 'buy_car' | 'heal' | 'bribe_police';
  effectValue?: number | string;
}

export interface PhoneMessage {
  id: string;
  sender: string;
  senderRole: string;
  text: string;
  timestamp: string;
  read: boolean;
  missionTriggerId?: string;
}

export interface PhoneContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  avatarColor: string;
  status: 'online' | 'ocupado';
  messages: PhoneMessage[];
}

export interface Property {
  id: string;
  name: string;
  price: number;
  address: string;
  isOwned: boolean;
  position: [number, number, number];
}

export interface GameSaveData {
  version: number;
  character: CharacterConfig;
  money: number;
  energy: number;
  completedDeliveries: number;
  reputation: number;
  playerPosition: [number, number, number];
  playerRotation: number;
  carPosition: [number, number, number];
  carColor: string;
  carModel?: 'popular' | 'gt' | 'suv' | 'moto';
  hasCarTuning?: boolean;
  timeOfDay?: number;
  isInsideHouse?: boolean;
  wantedLevel?: number; // 0 to 3
  currentStoryIndex?: number;
  inventory?: InventoryItem[];
  ownedProperties?: string[];
  contacts?: PhoneContact[];
  lastSavedAt: number;
}
