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
  type: 'food' | 'drink' | 'tool' | 'key' | 'healing' | 'clothes';
  effectType?: 'hunger' | 'energy' | 'hygiene' | 'health';
  effectValue?: number;
  description: string;
  icon?: string;
}

export interface PlayerNeeds {
  hunger: number;   // 0 - 100 (Fome)
  energy: number;   // 0 - 100 (Energia)
  hygiene: number;  // 0 - 100 (Higiene)
  sleep: number;    // 0 - 100 (Sono / Disposição)
  health: number;   // 0 - 100 (Vida)
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

export interface AppRide {
  id: string;
  passengerName: string;
  passengerRole: string;
  passengerSkin: string;
  passengerTop: string;
  pickupPosition: [number, number, number];
  pickupAddress: string;
  destinationPosition: [number, number, number];
  destinationAddress: string;
  fare: number;
  tip: number;
  state: 'driving_to_pickup' | 'passenger_boarding' | 'driving_to_dest' | 'completed';
}

export type InteractionType =
  | 'delivery_hub'
  | 'store_padaria'
  | 'store_mercado'
  | 'store_oficina'
  | 'store_concessionaria'
  | 'store_roupas'
  | 'store_shopping'
  | 'store_hospital'
  | 'store_posto'
  | 'delivery_dropoff'
  | 'player_house_door'
  | 'player_house_bed'
  | 'player_house_wardrobe'
  | 'player_house_tv'
  | 'player_house_fridge'
  | 'player_house_sofa'
  | 'player_house_shower'
  | 'player_house_save_station'
  | 'player_house_exit'
  | 'bus_stop'
  | 'npc_dialog'
  | 'uber_pickup'
  | 'uber_dropoff'
  | 'senai_school'
  | 'senai_package_pickup'
  | 'real_estate_metropole'
  | 'real_estate_torre';

export interface InteractionPoint {
  id: string;
  name: string;
  type: InteractionType;
  position: [number, number, number];
  radius: number;
  promptText: string;
  extraData?: Record<string, unknown>;
}

export interface DialogOption {
  text: string;
  replyText: string;
  affinityBonus?: number;
  nextDialogIndex?: number;
  action?: 'accept_delivery' | 'open_store' | 'start_ride' | 'date_invite';
  storeCategory?: StoreCategory;
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
  options?: DialogOption[];
  speed: number;
  skinTone: string;
  hairStyle: 'curto' | 'degrade' | 'dreads' | 'longo' | 'raspado';
  hairColor: string;
  topColor: string;
  bottomColor: string;
  affinity?: number;
  relationshipStatus?: 'conhecido' | 'amigo' | 'melhor_amigo' | 'paquera' | 'namorando';
  isRomanceOption?: boolean;
  health?: number;
}

export interface TrafficVehicleData {
  id: string;
  type: 'car' | 'bus' | 'moto' | 'police';
  color: string;
  position: [number, number, number];
  heading: number;
  speed: number;
  laneAxis: 'x' | 'z';
  fixedCoord: number;
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
  | 'shopping'
  | 'hospital'
  | 'posto';

export interface StoreItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category: StoreCategory;
  effectType?: 'energy' | 'hunger' | 'hygiene' | 'health' | 'custom_color' | 'car_repair' | 'car_tuning' | 'buy_car' | 'inventory';
  effectValue?: number | string;
}

export interface PhoneChatMessage {
  id: string;
  sender: 'npc' | 'player';
  text: string;
  timestamp: string;
}

export interface PhoneContact {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
  affinity: number; // 0 - 100
  relationshipStatus: 'conhecido' | 'amigo' | 'melhor_amigo' | 'paquera' | 'namorando';
  isRomanceCandidate?: boolean;
  chatHistory: PhoneChatMessage[];
  quickReplies?: Array<{ text: string; response: string; affinityDelta: number }>;
}

export interface GameSaveData {
  version: number;
  character: CharacterConfig;
  money: number;
  energy: number;
  hunger?: number;
  hygiene?: number;
  sleep?: number;
  health?: number;
  wantedLevel?: number;
  completedDeliveries: number;
  completedRides?: number;
  reputation: number;
  playerPosition: [number, number, number];
  playerRotation: number;
  carPosition: [number, number, number];
  carColor: string;
  carModel?: 'popular' | 'gt' | 'suv' | 'moto';
  hasCarTuning?: boolean;
  timeOfDay?: number;
  isInsideHouse?: boolean;
  career?: 'livre' | 'entregador' | 'motorista' | 'comercio';
  ownedProperties?: string[];
  weather?: 'sunny' | 'cloudy' | 'rain';
  inventory?: InventoryItem[];
  contacts?: PhoneContact[];
  lastSavedAt: number;
}

