import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CharacterConfig,
  GameSaveData,
  DeliveryMission,
  StoreCategory,
  StoreItem,
  NPCData,
  PlayerNeeds,
  AppRide,
  PhoneContact,
} from './types';
import { GameEngine } from './game/GameEngine';
import { Canvas2DGameEngine } from './game/Canvas2DGameEngine';
import { InteractionPoint } from './game/cityMap';
import { CharacterCreator } from './components/CharacterCreator';
import { HUD } from './components/HUD';
import { StoreModal } from './components/StoreModal';
import { PauseMenu } from './components/PauseMenu';
import { NpcDialogModal } from './components/NpcDialogModal';
import { PhoneModal } from './components/PhoneModal';
import { NotificationToast, ToastMessage } from './components/NotificationToast';
import { soundManager } from './audio/soundManager';

const SAVE_KEY = 'citylife_rp_save_v2';

const DEFAULT_CHARACTER: CharacterConfig = {
  name: 'Morador da Cidade',
  skinTone: '#d29b74',
  hairStyle: 'curto',
  hairColor: '#1a1105',
  topType: 'camiseta',
  topColor: '#2563eb',
  bottomType: 'jeans',
  bottomColor: '#0f172a',
  shoesColor: '#ffffff',
};

const DEFAULT_NEEDS: PlayerNeeds = {
  hunger: 85,
  energy: 100,
  hygiene: 90,
  sleep: 95,
  health: 100,
};

const INITIAL_CONTACTS: PhoneContact[] = [
  {
    id: 'beto',
    name: 'Beto (Coprotagonista)',
    role: 'Amigo de Infância & Parceiro',
    avatarColor: '#3b82f6',
    affinity: 65,
    relationshipStatus: 'amigo',
    chatHistory: [
      { id: 'm1', sender: 'npc', text: 'E aí parceiro! Bora dar uma volta de carro pelo centro?', timestamp: '09:15' },
      { id: 'm2', sender: 'player', text: 'Com certeza! Só terminando umas entregas da Flash Express.', timestamp: '09:16' },
      { id: 'm3', sender: 'npc', text: 'Boa sorte! Se precisar de uma força, passa lá na minha casa.', timestamp: '09:18' },
    ],
    quickReplies: [
      { text: 'Como você tá, meu parceiro?', response: 'Tudo firmeza irmão! Trabalhando e curtindo o rolê.', affinityDelta: 8 },
      { text: 'Conhece alguém precisando de corrida no Urbano?', response: 'Sempre tem gente perto do Shopping Metrópole e na Praça!', affinityDelta: 10 },
      { text: 'Bora comer um lanche mais tarde?', response: 'Fechou! Aquele pastel da feira ou marmitex caprichado.', affinityDelta: 12 },
    ],
  },
  {
    id: 'juliana',
    name: 'Juliana',
    role: 'Arquiteta & Designer',
    avatarColor: '#ec4899',
    affinity: 35,
    relationshipStatus: 'conhecido',
    isRomanceCandidate: true,
    chatHistory: [
      { id: 'j1', sender: 'npc', text: 'Oi! Adorei ver você pela praça outro dia.', timestamp: '11:20' },
      { id: 'j2', sender: 'player', text: 'Oi Juliana! Muito bom falar com você.', timestamp: '11:25' },
    ],
    quickReplies: [
      { text: 'Você estava deslumbrante ontem!', response: 'Nossa, que gentil! Fiquei até envergonhada haha ❤️', affinityDelta: 15 },
      { text: 'O que você mais gosta de fazer na cidade?', response: 'Adoro tomar um açaí no Shopping e passear no final da tarde!', affinityDelta: 12 },
      { text: 'Aceita tomar um café comigo na Padaria Pão Dourado?', response: 'Adoraria! Me avisa quando estiver por lá!', affinityDelta: 20 },
    ],
  },
  {
    id: 'tiago',
    name: 'Tiago Mecânico',
    role: 'Oficina Mecânica Auto Car',
    avatarColor: '#0284c7',
    affinity: 50,
    relationshipStatus: 'amigo',
    chatHistory: [
      { id: 't1', sender: 'npc', text: 'Fala piloto! Precisando de uma revisão ou pintura nova no bólido, só encostar.', timestamp: '08:40' },
    ],
    quickReplies: [
      { text: 'O kit turbo faz muita diferença?', response: 'Dá mais de 20% de aceleração e final, parceiro! Vale cada centavo.', affinityDelta: 8 },
      { text: 'Como tá o movimento na oficina?', response: 'Bombando! Muito trampo hoje graças a Deus.', affinityDelta: 6 },
    ],
  },
  {
    id: 'dona_maria',
    name: 'Dona Maria',
    role: 'Mercadinho Vila Nova',
    avatarColor: '#10b981',
    affinity: 55,
    relationshipStatus: 'amigo',
    chatHistory: [
      { id: 'dm1', sender: 'npc', text: 'Querido, chegaram maçãs frescas e água mineral geladinha hoje!', timestamp: '07:30' },
    ],
    quickReplies: [
      { text: 'Obrigado pelo aviso Dona Maria!', response: 'Por nada meu filho, Deus te abençoe nas ruas!', affinityDelta: 10 },
    ],
  },
  {
    id: 'sargento_silva',
    name: 'Sargento Silva',
    role: 'Polícia Militar / Trânsito',
    avatarColor: '#ef4444',
    affinity: 25,
    relationshipStatus: 'conhecido',
    chatHistory: [
      { id: 'ss1', sender: 'npc', text: 'Cidadão, dirija com prudência e respeite as faixas de pedestres de Vila Esperança.', timestamp: '10:00' },
    ],
    quickReplies: [
      { text: 'Entendido Sargento, respeito total.', response: 'Correto. A ordem pública depende de todos.', affinityDelta: 10 },
      { text: 'A cidade está tranquila hoje?', response: 'Patrulhas ativas em todas as avenidas periféricas.', affinityDelta: 6 },
    ],
  },
];

const BUS_STOPS = [
  { id: 'bus_stop_norte', name: 'Parada Norte (Praça Central)', pos: [-9.5, 0, -40] as [number, number, number] },
  { id: 'bus_stop_shopping', name: 'Parada Leste (Shopping Metrópole)', pos: [75, 0, -40] as [number, number, number] },
  { id: 'bus_stop_sul', name: 'Parada Sul (Vila das Flores)', pos: [-9.5, 0, 40] as [number, number, number] },
];

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch {
    return false;
  }
}

function loadSaveData(): GameSaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem('citylife_rp_save_v1');
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && typeof data === 'object' && data.character && typeof data.money === 'number') {
      return data as GameSaveData;
    }
  } catch {
    // Ignore corrupted save
  }
  return null;
}

export default function App() {
  const [saveData, setSaveData] = useState<GameSaveData | null>(loadSaveData);
  const [hasStarted, setHasStarted] = useState<boolean>(() => !!loadSaveData());
  const [isEditingCharacter, setIsEditingCharacter] = useState<boolean>(!loadSaveData());

  // Player & Core Simulation State
  const [characterConfig, setCharacterConfig] = useState<CharacterConfig>(
    () => saveData?.character || DEFAULT_CHARACTER
  );
  const [money, setMoney] = useState<number>(() => (saveData?.money !== undefined ? saveData.money : 250));
  const [needs, setNeeds] = useState<PlayerNeeds>(() => ({
    hunger: saveData?.hunger ?? DEFAULT_NEEDS.hunger,
    energy: saveData?.energy ?? DEFAULT_NEEDS.energy,
    hygiene: saveData?.hygiene ?? DEFAULT_NEEDS.hygiene,
    sleep: saveData?.sleep ?? DEFAULT_NEEDS.sleep,
    health: saveData?.health ?? DEFAULT_NEEDS.health,
  }));
  const [wantedLevel, setWantedLevel] = useState<number>(() => saveData?.wantedLevel || 0);
  const [completedDeliveries, setCompletedDeliveries] = useState<number>(
    () => saveData?.completedDeliveries || 0
  );
  const [completedRides, setCompletedRides] = useState<number>(() => saveData?.completedRides || 0);

  // Car State
  const [carColor, setCarColor] = useState<string>(() => saveData?.carColor || '#2563eb');
  const [carModel, setCarModel] = useState<'popular' | 'gt' | 'suv' | 'moto'>(() => saveData?.carModel || 'popular');
  const [hasCarTuning, setHasCarTuning] = useState<boolean>(() => !!saveData?.hasCarTuning);
  const [timeOfDay, setTimeOfDay] = useState<number>(() => (saveData?.timeOfDay !== undefined ? saveData.timeOfDay : 10.5));
  const [isInsideHouse, setIsInsideHouse] = useState<boolean>(() => !!saveData?.isInsideHouse);

  // Phone contacts & social progression
  const [contacts, setContacts] = useState<PhoneContact[]>(() => saveData?.contacts || INITIAL_CONTACTS);

  // Graphics Mode: 3D or 2D Fallback
  const [renderMode, setRenderMode] = useState<'3d' | '2d'>(() => (isWebGLAvailable() ? '3d' : '2d'));

  // Runtime HUD states
  const [isDriving, setIsDriving] = useState(false);
  const [speedKmH, setSpeedKmH] = useState(0);
  const [playerPosition, setPlayerPosition] = useState<[number, number, number]>(() =>
    saveData?.playerPosition || [0, 0, 0]
  );
  const [playerRotationY, setPlayerRotationY] = useState(0);
  const [carPosition, setCarPosition] = useState<[number, number, number]>(() =>
    saveData?.carPosition || [5, 0, 4]
  );
  const [nearbyInteraction, setNearbyInteraction] = useState<InteractionPoint | null>(null);
  const [canEnterCar, setCanEnterCar] = useState(false);
  const [canExitCar, setCanExitCar] = useState(false);
  const [activeMission, setActiveMission] = useState<DeliveryMission | null>(null);
  const [activeRide, setActiveRide] = useState<AppRide | null>(null);
  const [isRidingBus, setIsRidingBus] = useState(false);

  // Modals & Dialogs
  const [isPhoneOpen, setIsPhoneOpen] = useState(false);
  const [activeStoreCategory, setActiveStoreCategory] = useState<StoreCategory | null>(null);
  const [activeNpcDialog, setActiveNpcDialog] = useState<NPCData | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [mouseSensitivity, setMouseSensitivity] = useState(0.0025);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Engine ref
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | Canvas2DGameEngine | null>(null);

  // Calculate speed multiplier
  const getSpeedMultiplier = useCallback(() => {
    let mult = 1.0;
    if (carModel === 'gt') mult *= 1.25;
    if (carModel === 'suv') mult *= 1.35;
    if (hasCarTuning) mult *= 1.20;
    return mult;
  }, [carModel, hasCarTuning]);

  // Toast Helper
  const addToast = useCallback((title: string, description?: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  // Block/Unblock engine inputs when modal open
  useEffect(() => {
    const isAnyModalOpen =
      isPaused ||
      isEditingCharacter ||
      isPhoneOpen ||
      activeStoreCategory !== null ||
      activeNpcDialog !== null;
    if (engineRef.current) {
      engineRef.current.isInputBlocked = isAnyModalOpen;
      if (isAnyModalOpen) {
        engineRef.current.keys = {};
      }
    }
  }, [isPaused, isEditingCharacter, isPhoneOpen, activeStoreCategory, activeNpcDialog]);

  // Save current progress
  const saveProgress = useCallback(() => {
    if (!engineRef.current) return;
    const currentData: GameSaveData = {
      version: 2,
      character: characterConfig,
      money,
      energy: needs.energy,
      hunger: needs.hunger,
      hygiene: needs.hygiene,
      sleep: needs.sleep,
      health: needs.health,
      wantedLevel,
      completedDeliveries,
      completedRides,
      reputation: Math.floor(completedDeliveries * 1.5 + completedRides * 2),
      playerPosition: [
        engineRef.current.playerPhysics.x,
        engineRef.current.playerPhysics.y,
        engineRef.current.playerPhysics.z,
      ],
      playerRotation: engineRef.current.playerPhysics.rotationY,
      carPosition: [
        engineRef.current.carPhysics.x,
        0,
        engineRef.current.carPhysics.z,
      ],
      carColor,
      carModel,
      hasCarTuning,
      timeOfDay,
      isInsideHouse,
      contacts,
      lastSavedAt: Date.now(),
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(currentData));
      setSaveData(currentData);
    } catch {
      // Storage full
    }
  }, [
    characterConfig,
    money,
    needs,
    wantedLevel,
    completedDeliveries,
    completedRides,
    carColor,
    carModel,
    hasCarTuning,
    timeOfDay,
    isInsideHouse,
    contacts,
  ]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!hasStarted) return;
    const interval = setInterval(() => {
      saveProgress();
    }, 30000);
    return () => clearInterval(interval);
  }, [hasStarted, saveProgress]);

  // The Sims style Needs Decay (Hunger, Sleep, Hygiene decay gradually)
  useEffect(() => {
    if (!hasStarted || isEditingCharacter || isPaused) return;
    const timer = setInterval(() => {
      setNeeds((prev) => {
        const nextHunger = Math.max(0, prev.hunger - 1.2);
        const nextSleep = Math.max(0, prev.sleep - 0.9);
        const nextHygiene = Math.max(0, prev.hygiene - 0.7);

        // If hungry or exhausted, health deteriorates slightly
        let nextHealth = prev.health;
        if (nextHunger <= 5 || nextSleep <= 5) {
          nextHealth = Math.max(0, prev.health - 2);
        }

        // Faint / Collapse check -> Hospital Visit
        if (nextHealth <= 0) {
          soundManager.playSiren();
          addToast(
            'Você desmaiou de exaustão!',
            'Socorrido e levado para o Hospital Central. Custo médico: R$ 50.',
            'warning'
          );
          setMoney((m) => Math.max(0, m - 50));
          if (engineRef.current) {
            engineRef.current.playerPhysics.x = -75;
            engineRef.current.playerPhysics.y = 0;
            engineRef.current.playerPhysics.z = -75;
            engineRef.current.playerPhysics.vx = 0;
            engineRef.current.playerPhysics.vz = 0;
          }
          return {
            hunger: 60,
            energy: 70,
            hygiene: 70,
            sleep: 80,
            health: 80,
          };
        }

        return {
          ...prev,
          hunger: nextHunger,
          sleep: nextSleep,
          hygiene: nextHygiene,
          energy: Math.min(prev.energy, nextSleep),
          health: nextHealth,
        };
      });
    }, 12000);

    return () => clearInterval(timer);
  }, [hasStarted, isEditingCharacter, isPaused, addToast]);

  // Police Wanted Level Decay (Stars decrease every 35s if clean)
  useEffect(() => {
    if (!hasStarted || wantedLevel <= 0) return;
    const starTimer = setInterval(() => {
      setWantedLevel((w) => {
        const next = Math.max(0, w - 1);
        if (next === 0) {
          addToast('Alerta Policial Encerrado', 'A polícia perdeu o seu rastro. Nível procurado zerado.', 'info');
        }
        return next;
      });
    }, 35000);
    return () => clearInterval(starTimer);
  }, [hasStarted, wantedLevel, addToast]);

  // Mission Delivery Completion Handler
  const handleMissionDelivered = useCallback(
    (mission: DeliveryMission) => {
      setMoney((m) => m + mission.reward);
      setCompletedDeliveries((d) => d + 1);
      setActiveMission(null);
      if (engineRef.current) {
        engineRef.current.setActiveMission(null);
      }
      soundManager.playMissionComplete();
      addToast(
        `Entrega Concluída! + R$ ${mission.reward}`,
        `Você entregou com sucesso o pedido para ${mission.clientName}.`,
        'success'
      );
      saveProgress();
    },
    [addToast, saveProgress]
  );

  // Generate new delivery mission
  const generateNewDeliveryMission = useCallback(() => {
    const destinations = [
      { name: 'Minha Casa (#42)', pos: [-25, 0, -21] as [number, number, number], client: 'Você (Encomenda Pessoal)', desc: 'Peças para Casa' },
      { name: 'Casa 101 (Dona Neusa)', pos: [-25, 0, 71] as [number, number, number], client: 'Dona Neusa', desc: 'Caixa de Encomenda Urgente' },
      { name: 'Casa 102 (Seu Jorge)', pos: [25, 0, 71] as [number, number, number], client: 'Seu Jorge', desc: 'Peças de Reparo Eletrônico' },
      { name: 'Casa 103 (Família Santos)', pos: [75, 0, 71] as [number, number, number], client: 'Sr. Santos', desc: 'Suprimentos Familiares' },
      { name: 'Casa 104 (Camila)', pos: [-75, 0, 71] as [number, number, number], client: 'Camila', desc: 'Pacote de Roupas Fashion' },
      { name: 'Casa 105 (Dr. Marcos)', pos: [-25, 0, -71] as [number, number, number], client: 'Dr. Marcos', desc: 'Documentos do Cartório' },
      { name: 'Edifício Metrópole', pos: [75, 0, -15] as [number, number, number], client: 'Portaria Metrópole', desc: 'Contratos Comerciais' },
      { name: 'Shopping Metrópole', pos: [75, 0, -25] as [number, number, number], client: 'Gabriela (Gerente)', desc: 'Maleta de Encomendas' },
      { name: 'Hospital Central', pos: [-75, 0, -75] as [number, number, number], client: 'Recepção Médica', desc: 'Remédios Refrigerados' },
      { name: 'Posto Brasil', pos: [75, 0, 75] as [number, number, number], client: 'Conveniência Brasil', desc: 'Café e Bebidas Especiais' },
      { name: 'Padaria Pão Dourado', pos: [25, 0, -19] as [number, number, number], client: 'Balcão da Padaria', desc: 'Café Especial Selecionado' },
      { name: 'Mercadinho Vila Nova', pos: [-75, 0, -19] as [number, number, number], client: 'Dona Maria', desc: 'Bebidas e Mantimentos' },
    ];

    const target = destinations[Math.floor(Math.random() * destinations.length)];
    const reward = Math.floor(Math.random() * 60) + 90;

    const newMission: DeliveryMission = {
      id: `delivery_${Date.now()}`,
      title: 'Entrega Flash Express',
      clientName: target.client,
      destinationName: target.name,
      targetPosition: target.pos,
      reward,
      itemDescription: target.desc,
    };

    setActiveMission(newMission);
    if (engineRef.current) {
      engineRef.current.setActiveMission(newMission);
    }
    soundManager.playCashSound();
    addToast(
      'Nova Encomenda Aceita!',
      `Leve o pacote até ${target.name} (${target.client}) para receber R$ ${reward}.`,
      'info'
    );
  }, [addToast]);

  // Handle NPC Punch / Physical Combat
  const handleNpcHit = useCallback(
    (npc: NPCData) => {
      setWantedLevel((prev) => Math.min(3, prev + 1));
      soundManager.playSiren();
      addToast(
        `Agressão Denunciada! (+1 Estrela)`,
        `Você agrediu ${npc.name}! A viatura da polícia foi acionada.`,
        'warning'
      );
    },
    [addToast]
  );

  // Handle Boarding City Bus
  const handleBoardBus = useCallback(
    (stopId: string) => {
      if (money < 4.5) {
        addToast('Saldo Insuficiente', 'A passagem do ônibus municipal custa R$ 4,50.', 'warning');
        return;
      }

      setMoney((m) => m - 4.5);
      soundManager.playBusChime();
      setIsRidingBus(true);

      const currentIndex = BUS_STOPS.findIndex((s) => s.id === stopId);
      const nextStop = BUS_STOPS[(currentIndex + 1) % BUS_STOPS.length];

      addToast(
        'A Bordo do Ônibus Municipal',
        `Linha 101 Circular. Próxima parada: ${nextStop.name}.`,
        'info'
      );

      // Travel to next stop after brief ride
      setTimeout(() => {
        if (engineRef.current) {
          engineRef.current.playerPhysics.x = nextStop.pos[0];
          engineRef.current.playerPhysics.y = 0;
          engineRef.current.playerPhysics.z = nextStop.pos[2];
          engineRef.current.playerPhysics.vx = 0;
          engineRef.current.playerPhysics.vz = 0;
        }
        setIsRidingBus(false);
        soundManager.playBusChime();
        addToast('Você Desembarcou', `Chegada em ${nextStop.name}.`, 'success');
      }, 1600);
    },
    [money, addToast]
  );

  // Mount Game Engine
  useEffect(() => {
    if (!hasStarted || isEditingCharacter) return;
    const container = canvasMountRef.current;
    if (!container) return;

    if (engineRef.current) {
      engineRef.current.dispose();
      engineRef.current = null;
    }
    container.innerHTML = '';

    const spawnPos: [number, number, number] = [
      saveData?.playerPosition?.[0] || 0,
      saveData?.playerPosition?.[1] || 0,
      saveData?.playerPosition?.[2] || 0,
    ];

    const callbacks = {
      onInteractionAvailable: (point: InteractionPoint | null, enterCar: boolean, exitCar: boolean) => {
        setNearbyInteraction(point);
        setCanEnterCar(enterCar);
        setCanExitCar(exitCar);
        if (engineRef.current) {
          setIsDriving(engineRef.current.isDriving);
        }
      },
      onMissionDelivered: handleMissionDelivered,
      onSpeedUpdate: (spd: number) => {
        setSpeedKmH(spd);
      },
      onPlayerPositionUpdate: (pos: [number, number, number], rotY: number) => {
        setPlayerPosition(pos);
        setPlayerRotationY(rotY);
      },
      onCarPositionUpdate: (pos: [number, number, number]) => {
        setCarPosition(pos);
      },
      onTimeUpdate: (t: number) => {
        setTimeOfDay(t);
      },
      onOpenNpcDialog: (npc: NPCData) => {
        setActiveNpcDialog(npc);
      },
      onHouseTransition: (isInside: boolean) => {
        setIsInsideHouse(isInside);
        addToast(
          isInside ? 'Entrou em Minha Casa' : 'Saiu para a Rua',
          isInside
            ? 'Tome um banho quente para higiene, durma para restaurar sono ou use o notebook para salvar.'
            : 'Bem-vindo de volta às ruas de Vila Esperança.',
          'info'
        );
      },
      onTriggerInteraction: () => {
        handleTriggerInteraction();
      },
      onNpcHit: handleNpcHit,
      onBoardBus: handleBoardBus,
    };

    let engineInitialized = false;

    if (renderMode === '3d') {
      try {
        const engine3d = new GameEngine(
          container,
          characterConfig,
          carColor,
          spawnPos,
          callbacks,
          timeOfDay,
          isInsideHouse,
          getSpeedMultiplier()
        );
        engine3d.mouseSensitivity = mouseSensitivity;
        engineRef.current = engine3d;
        engineInitialized = true;
      } catch (err: unknown) {
        console.warn('WebGL init failed, falling back to 2D canvas:', err);
        container.innerHTML = '';
        setRenderMode('2d');
        addToast(
          'Modo 2D Otimizado Ativo',
          'WebGL indisponível neste navegador. Cidade carregada em 2D com sucesso.',
          'info'
        );
      }
    }

    if (!engineInitialized) {
      try {
        const engine2d = new Canvas2DGameEngine(
          container,
          characterConfig,
          carColor,
          spawnPos,
          callbacks,
          timeOfDay,
          isInsideHouse,
          getSpeedMultiplier()
        );
        engine2d.mouseSensitivity = mouseSensitivity;
        engineRef.current = engine2d;
      } catch (err2) {
        console.error('Canvas 2D failed as well:', err2);
      }
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, [hasStarted, isEditingCharacter, renderMode]);

  // Contextual Interaction Trigger ([E] Key or Button)
  const handleTriggerInteraction = useCallback(() => {
    if (!engineRef.current) return;

    if (canEnterCar) {
      engineRef.current.enterVehicle();
      setIsDriving(true);
      return;
    }
    if (canExitCar) {
      engineRef.current.exitVehicle();
      setIsDriving(false);
      return;
    }

    // Active Ride Pickup & Dropoff
    if (activeRide) {
      const px = engineRef.current.playerPhysics.x;
      const pz = engineRef.current.playerPhysics.z;

      if (activeRide.state === 'driving_to_pickup') {
        const pDist = Math.hypot(px - activeRide.pickupPosition[0], pz - activeRide.pickupPosition[2]);
        if (pDist < 6.0) {
          activeRide.state = 'driving_to_dest';
          if (engineRef.current instanceof GameEngine) {
            engineRef.current.setPassengerInCar({
              name: activeRide.passengerName,
              skinTone: activeRide.passengerSkin,
              hairStyle: 'curto',
              hairColor: '#1a1105',
              topType: 'camiseta',
              topColor: activeRide.passengerTop,
              bottomType: 'jeans',
              bottomColor: '#1e293b',
              shoesColor: '#ffffff',
            });
            engineRef.current.setActiveWaypoint(activeRide.destinationPosition, 0x06b6d4);
          }
          soundManager.playDoorOpen();
          addToast(
            `Passageiro a Bordo!`,
            `${activeRide.passengerName} embarcou. Leve-o até ${activeRide.destinationAddress}.`,
            'success'
          );
          return;
        }
      } else if (activeRide.state === 'driving_to_dest') {
        const dDist = Math.hypot(px - activeRide.destinationPosition[0], pz - activeRide.destinationPosition[2]);
        if (dDist < 6.0) {
          const totalPay = activeRide.fare + activeRide.tip;
          setMoney((m) => m + totalPay);
          setCompletedRides((r) => r + 1);
          setActiveRide(null);
          if (engineRef.current instanceof GameEngine) {
            engineRef.current.setPassengerInCar(null);
            engineRef.current.setActiveWaypoint(null);
          }
          soundManager.playMissionComplete();
          addToast(
            `Corrida Concluída! + R$ ${totalPay}`,
            `Passageiro entregue em segurança (Tarifa: R$ ${activeRide.fare} + Gorjeta: R$ ${activeRide.tip}).`,
            'success'
          );
          saveProgress();
          return;
        }
      }
    }

    // Active Flash Express Mission Drop-off
    if (activeMission) {
      const px = engineRef.current.playerPhysics.x;
      const pz = engineRef.current.playerPhysics.z;
      const mDist = Math.hypot(px - activeMission.targetPosition[0], pz - activeMission.targetPosition[2]);
      if (mDist < 5.0) {
        handleMissionDelivered(activeMission);
        return;
      }
    }

    // Specific Point Interactions
    if (nearbyInteraction) {
      if (nearbyInteraction.type === 'bus_stop') {
        handleBoardBus(nearbyInteraction.id);
        return;
      }

      if (nearbyInteraction.type === 'delivery_hub') {
        if (activeMission) {
          addToast('Você já tem uma entrega em andamento!', 'Entregue o pacote no destino marcado no GPS.', 'warning');
        } else {
          generateNewDeliveryMission();
        }
        return;
      }

      // House Amenities
      if (nearbyInteraction.type === 'player_house_shower') {
        soundManager.playShower();
        setNeeds((n) => ({
          ...n,
          hygiene: 100,
          energy: Math.min(100, n.energy + 10),
        }));
        addToast('Banho Quente Tomado!', 'Higiene restaurada em 100% no chuveiro da sua casa.', 'success');
        saveProgress();
        return;
      }

      if (nearbyInteraction.type === 'player_house_bed') {
        soundManager.playCashSound();
        setNeeds((n) => ({
          ...n,
          sleep: 100,
          energy: 100,
          health: Math.min(100, n.health + 20),
        }));
        setTimeOfDay(7.0);
        addToast('Descanso Realizado!', 'Energia e sono 100% restaurados e amanheceu (07:00).', 'success');
        saveProgress();
        return;
      }

      if (nearbyInteraction.type === 'player_house_wardrobe') {
        setIsEditingCharacter(true);
        return;
      }

      if (nearbyInteraction.type === 'player_house_fridge') {
        soundManager.playCashSound();
        setNeeds((n) => ({
          ...n,
          hunger: Math.min(100, n.hunger + 35),
          energy: Math.min(100, n.energy + 20),
        }));
        addToast('Lanche da Geladeira!', 'Você fez um lanche completo (+35% Fome, +20% Energia).', 'success');
        saveProgress();
        return;
      }

      if (nearbyInteraction.type === 'player_house_sofa') {
        soundManager.playUiClick();
        setNeeds((n) => ({
          ...n,
          energy: Math.min(100, n.energy + 20),
          sleep: Math.min(100, n.sleep + 10),
        }));
        addToast('Relaxando no Sofá', 'Assistindo um programa de TV (+20% de Energia).', 'info');
        saveProgress();
        return;
      }

      if (nearbyInteraction.type === 'player_house_save_station') {
        saveProgress();
        soundManager.playCashSound();
        addToast('Progresso Salvo!', 'Jogo salvo no notebook da sua casa com sucesso.', 'success');
        return;
      }

      if (nearbyInteraction.type === 'npc_dialog' && nearbyInteraction.extraData?.npcId) {
        const npc = engineRef.current?.cityData.npcs.find((n) => n.id === nearbyInteraction.extraData?.npcId);
        if (npc) {
          setActiveNpcDialog(npc);
          return;
        }
      }

      // Store Triggers
      if (nearbyInteraction.type === 'store_padaria') {
        setActiveStoreCategory('padaria');
        return;
      }
      if (nearbyInteraction.type === 'store_mercado') {
        setActiveStoreCategory('mercado');
        return;
      }
      if (nearbyInteraction.type === 'store_oficina') {
        setActiveStoreCategory('oficina');
        return;
      }
      if (nearbyInteraction.type === 'store_concessionaria') {
        setActiveStoreCategory('concessionaria');
        return;
      }
      if (nearbyInteraction.type === 'store_roupas') {
        setActiveStoreCategory('roupas');
        return;
      }
      if (nearbyInteraction.type === 'store_shopping') {
        setActiveStoreCategory('shopping');
        return;
      }
      if (nearbyInteraction.type === 'store_hospital') {
        setActiveStoreCategory('hospital');
        return;
      }
      if (nearbyInteraction.type === 'store_posto') {
        setActiveStoreCategory('posto');
        return;
      }
    }

    engineRef.current.triggerInteraction();
  }, [
    canEnterCar,
    canExitCar,
    activeRide,
    activeMission,
    nearbyInteraction,
    generateNewDeliveryMission,
    handleMissionDelivered,
    handleBoardBus,
    addToast,
    saveProgress,
  ]);

  // Global Key Listeners: ESC (Pause/Close), KeyP (Smartphone)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!hasStarted || isEditingCharacter) return;

      if (e.code === 'KeyP') {
        setIsPhoneOpen((p) => !p);
        soundManager.playUiClick();
        return;
      }

      if (e.code === 'Escape') {
        if (isPhoneOpen) {
          setIsPhoneOpen(false);
        } else if (activeStoreCategory) {
          setActiveStoreCategory(null);
        } else if (activeNpcDialog) {
          setActiveNpcDialog(null);
        } else {
          setIsPaused((p) => !p);
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasStarted, isEditingCharacter, isPhoneOpen, activeStoreCategory, activeNpcDialog]);

  // Store purchases handler
  const handleBuyItem = (item: StoreItem): boolean => {
    if (money < item.price) return false;
    setMoney((m) => m - item.price);

    // Apply item effects to Needs
    if (item.effectType === 'hunger' && item.effectValue) {
      setNeeds((prev) => ({
        ...prev,
        hunger: Math.min(100, prev.hunger + Number(item.effectValue)),
        energy: Math.min(100, prev.energy + 10),
      }));
    } else if (item.effectType === 'energy' && item.effectValue) {
      setNeeds((prev) => ({
        ...prev,
        energy: Math.min(100, prev.energy + Number(item.effectValue)),
      }));
    } else if (item.effectType === 'health' && item.effectValue) {
      setNeeds((prev) => ({
        ...prev,
        health: Math.min(100, prev.health + Number(item.effectValue)),
      }));
    } else if (item.effectType === 'hygiene' && item.effectValue) {
      setNeeds((prev) => ({
        ...prev,
        hygiene: Math.min(100, prev.hygiene + Number(item.effectValue)),
      }));
    }

    soundManager.playCashSound();
    addToast(`${item.name} Comprado!`, `Saldo restante: R$ ${(money - item.price).toFixed(2)}.`, 'success');
    saveProgress();
    return true;
  };

  // Car Paint
  const handleRepaintCar = (newColorHex: string) => {
    setCarColor(newColorHex);
    if (engineRef.current) {
      engineRef.current.setCarColor(newColorHex);
    }
    soundManager.playCashSound();
    addToast('Pintura Automotiva Concluída!', 'A nova cor do veículo foi aplicada.', 'success');
    saveProgress();
  };

  // Car Purchase at Dealership
  const handleBuyCar = (model: 'popular' | 'gt' | 'suv' | 'moto', price: number) => {
    setCarModel(model);
    if (engineRef.current) {
      engineRef.current.speedMultiplier = getSpeedMultiplier();
    }
    soundManager.playCashSound();
    addToast('Novo Carro Adquirido!', `Você comprou o modelo ${model.toUpperCase()}!`, 'success');
    saveProgress();
  };

  // Apply Tuning Kit
  const handleApplyTuning = () => {
    setHasCarTuning(true);
    if (engineRef.current) {
      engineRef.current.speedMultiplier = getSpeedMultiplier();
    }
    soundManager.playCashSound();
    addToast('Tuning Instalado!', 'Seu veículo recebeu 20% a mais de potência e aceleração.', 'success');
    saveProgress();
  };

  // Update clothes
  const handleUpdateCharacterClothes = (updates: Partial<CharacterConfig>) => {
    const updated = { ...characterConfig, ...updates };
    setCharacterConfig(updated);
    if (engineRef.current) {
      engineRef.current.setCharacterConfig(updated);
    }
    soundManager.playCashSound();
    addToast('Estilo Atualizado!', 'Suas novas roupas foram salvas.', 'success');
    saveProgress();
  };

  // Smartphone Social Chat & Affinity Handler
  const handlePhoneSendMessage = (contactId: string, text: string, replyText: string, affinityDelta: number) => {
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id !== contactId) return c;
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const newAffinity = Math.min(100, c.affinity + affinityDelta);

        let newStatus = c.relationshipStatus;
        if (c.isRomanceCandidate && newAffinity >= 75) {
          newStatus = 'namorando';
        } else if (newAffinity >= 70) {
          newStatus = 'melhor_amigo';
        } else if (newAffinity >= 45) {
          newStatus = c.isRomanceCandidate ? 'paquera' : 'amigo';
        }

        const updatedHistory = [
          ...c.chatHistory,
          { id: `msg_${Date.now()}_1`, sender: 'player' as const, text, timestamp: timeStr },
          { id: `msg_${Date.now()}_2`, sender: 'npc' as const, text: replyText, timestamp: timeStr },
        ];

        return {
          ...c,
          affinity: newAffinity,
          relationshipStatus: newStatus,
          chatHistory: updatedHistory,
        };
      })
    );

    const contact = contacts.find((c) => c.id === contactId);
    if (contact) {
      addToast(
        `Afinidade com ${contact.name} +${affinityDelta}%`,
        `Relação fortalecida na cidade.`,
        'success'
      );
    }
  };

  // Accept Ride from Urbano Driver App
  const handleAcceptRide = (ride: AppRide) => {
    setActiveRide(ride);
    if (engineRef.current) {
      engineRef.current.setActiveWaypoint(ride.pickupPosition, 0x06b6d4);
    }
    soundManager.playPhoneNotification();
    addToast(
      'Nova Corrida Aceita!',
      `Dirija até ${ride.pickupAddress} para embarcar ${ride.passengerName}.`,
      'info'
    );
  };

  // Order food delivery via smartphone
  const handleBuyFoodOnline = (item: StoreItem): boolean => {
    if (money < item.price) return false;
    setMoney((m) => m - item.price);

    if (item.effectType === 'hunger' && item.effectValue) {
      setNeeds((n) => ({
        ...n,
        hunger: Math.min(100, n.hunger + Number(item.effectValue)),
        energy: Math.min(100, n.energy + 10),
      }));
    } else if (item.effectType === 'energy' && item.effectValue) {
      setNeeds((n) => ({
        ...n,
        energy: Math.min(100, n.energy + Number(item.effectValue)),
      }));
    }

    soundManager.playCashSound();
    saveProgress();
    return true;
  };

  // Set GPS route from Smartphone
  const handleSetGpsWaypoint = (pos: [number, number, number], name: string) => {
    if (engineRef.current) {
      engineRef.current.setActiveWaypoint(pos, 0x38bdf8);
    }
    addToast('Rota Traçada no GPS', `Siga o marcador azul até ${name}.`, 'info');
  };

  // Character Creator Finished
  const handleCharacterCreated = (cfg: CharacterConfig) => {
    setCharacterConfig(cfg);
    setIsEditingCharacter(false);
    setHasStarted(true);
    addToast('Visual Atualizado!', `Aparência de ${cfg.name} salva com sucesso.`);
    saveProgress();
  };

  // Reset position
  const handleResetPosition = () => {
    if (engineRef.current) {
      engineRef.current.playerPhysics.x = 0;
      engineRef.current.playerPhysics.y = 0;
      engineRef.current.playerPhysics.z = 0;
      engineRef.current.playerPhysics.vx = 0;
      engineRef.current.playerPhysics.vz = 0;
      engineRef.current.carPhysics.x = 5;
      engineRef.current.carPhysics.z = 4;
      engineRef.current.carPhysics.speed = 0;
    }
    setIsInsideHouse(false);
    setIsPaused(false);
    addToast('Posição Redefinida!', 'Você foi reposicionado na Praça Central.', 'info');
  };

  // Reset all progress
  const handleResetAllProgress = () => {
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem('citylife_rp_save_v1');
    } catch {}
    setMoney(250);
    setNeeds(DEFAULT_NEEDS);
    setWantedLevel(0);
    setCompletedDeliveries(0);
    setCompletedRides(0);
    setCarColor('#2563eb');
    setCarModel('popular');
    setHasCarTuning(false);
    setTimeOfDay(10.5);
    setIsInsideHouse(false);
    setContacts(INITIAL_CONTACTS);
    setCharacterConfig(DEFAULT_CHARACTER);
    setIsPaused(false);
    setIsEditingCharacter(true);
    setHasStarted(false);
  };

  const handleToggleRenderMode = () => {
    const nextMode = renderMode === '3d' ? '2d' : '3d';
    setRenderMode(nextMode);
    addToast(
      nextMode === '3d' ? 'Modo 3D Three.js Ativado' : 'Modo 2D Otimizado Ativado',
      'Mudança gráfica aplicada.',
      'info'
    );
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* 3D or 2D Viewport */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full z-0 overflow-hidden" />

      {/* Game HUD Overlay */}
      {hasStarted && !isEditingCharacter && (
        <HUD
          playerName={characterConfig.name}
          money={money}
          needs={needs}
          completedDeliveries={completedDeliveries}
          completedRides={completedRides}
          wantedLevel={wantedLevel}
          isDriving={isDriving}
          speedKmH={speedKmH}
          playerPosition={playerPosition}
          playerRotationY={playerRotationY}
          carPosition={carPosition}
          nearbyInteraction={nearbyInteraction}
          canEnterCar={canEnterCar}
          canExitCar={canExitCar}
          activeMission={activeMission}
          activeRide={activeRide}
          isRidingBus={isRidingBus}
          timeOfDay={timeOfDay}
          onTriggerInteraction={handleTriggerInteraction}
          onOpenPauseMenu={() => setIsPaused(true)}
          onOpenPhone={() => setIsPhoneOpen(true)}
          onPunchClick={() => {
            if (engineRef.current) {
              engineRef.current.triggerPunch();
            }
          }}
          onHornClick={() => soundManager.playHorn()}
        />
      )}

      {/* Floating Notifications */}
      <NotificationToast toasts={toasts} />

      {/* Character Creator Modal */}
      {isEditingCharacter && (
        <CharacterCreator
          initialConfig={characterConfig}
          onComplete={handleCharacterCreated}
        />
      )}

      {/* Interactive Smartphone Modal (Zap, Urbano, Flash, Lanches, GPS, Banco) */}
      {isPhoneOpen && (
        <PhoneModal
          money={money}
          timeOfDay={timeOfDay}
          contacts={contacts}
          activeRide={activeRide}
          activeDelivery={activeMission}
          onClose={() => setIsPhoneOpen(false)}
          onSendMessage={handlePhoneSendMessage}
          onAcceptRide={handleAcceptRide}
          onRequestDelivery={generateNewDeliveryMission}
          onBuyFoodOnline={handleBuyFoodOnline}
          onSetGpsWaypoint={handleSetGpsWaypoint}
        />
      )}

      {/* Store Modal (Padaria, Mercado, Shopping, Hospital, Posto, Oficina, Concessionária, Boutique) */}
      {activeStoreCategory && (
        <StoreModal
          category={activeStoreCategory}
          money={money}
          characterConfig={characterConfig}
          carColor={carColor}
          hasCarTuning={hasCarTuning}
          carModel={carModel}
          onClose={() => setActiveStoreCategory(null)}
          onBuyItem={handleBuyItem}
          onRepaintCar={handleRepaintCar}
          onUpdateCharacterClothes={handleUpdateCharacterClothes}
          onBuyCar={handleBuyCar}
          onApplyTuning={handleApplyTuning}
        />
      )}

      {/* NPC Dialogue Modal */}
      {activeNpcDialog && (
        <NpcDialogModal
          npc={activeNpcDialog}
          onClose={() => setActiveNpcDialog(null)}
          onAcceptDeliveryMission={generateNewDeliveryMission}
          onOpenStore={(cat) => {
            setActiveNpcDialog(null);
            setActiveStoreCategory(cat);
          }}
          onAffinityChange={(npcId, delta) => {
            handlePhoneSendMessage(
              npcId,
              'Muito bom conversar com você.',
              'O prazer é todo meu!',
              delta
            );
          }}
        />
      )}

      {/* Pause Menu */}
      {isPaused && (
        <PauseMenu
          onResume={() => setIsPaused(false)}
          onSaveGame={() => {
            saveProgress();
            addToast('Jogo Salvo!', 'Progresso gravado no armazenamento local.', 'success');
          }}
          onResetPosition={handleResetPosition}
          onOpenCharacterCreator={() => {
            setIsPaused(false);
            setIsEditingCharacter(true);
          }}
          onResetAllProgress={handleResetAllProgress}
          mouseSensitivity={mouseSensitivity}
          onSensitivityChange={(val) => {
            setMouseSensitivity(val);
            if (engineRef.current) {
              engineRef.current.mouseSensitivity = val;
            }
          }}
          renderMode={renderMode}
          onToggleRenderMode={handleToggleRenderMode}
        />
      )}
    </div>
  );
}
