import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CharacterConfig,
  GameSaveData,
  DeliveryMission,
  StoreCategory,
  StoreItem,
  NPCData,
} from './types';
import { GameEngine } from './game/GameEngine';
import { Canvas2DGameEngine } from './game/Canvas2DGameEngine';
import { InteractionPoint } from './game/cityMap';
import { CharacterCreator } from './components/CharacterCreator';
import { HUD } from './components/HUD';
import { StoreModal } from './components/StoreModal';
import { PauseMenu } from './components/PauseMenu';
import { NpcDialogModal } from './components/NpcDialogModal';
import { NotificationToast, ToastMessage } from './components/NotificationToast';
import { soundManager } from './audio/soundManager';

const SAVE_KEY = 'citylife_rp_save_v1';

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
    const raw = localStorage.getItem(SAVE_KEY);
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

  // Player & Game State
  const [characterConfig, setCharacterConfig] = useState<CharacterConfig>(
    () => saveData?.character || DEFAULT_CHARACTER
  );
  const [money, setMoney] = useState<number>(() => (saveData?.money !== undefined ? saveData.money : 250));
  const [energy, setEnergy] = useState<number>(() => (saveData?.energy !== undefined ? saveData.energy : 100));
  const [completedDeliveries, setCompletedDeliveries] = useState<number>(
    () => saveData?.completedDeliveries || 0
  );
  const [carColor, setCarColor] = useState<string>(() => saveData?.carColor || '#2563eb');
  const [carModel, setCarModel] = useState<'popular' | 'gt' | 'suv' | 'moto'>(() => saveData?.carModel || 'popular');
  const [hasCarTuning, setHasCarTuning] = useState<boolean>(() => !!saveData?.hasCarTuning);
  const [timeOfDay, setTimeOfDay] = useState<number>(() => (saveData?.timeOfDay !== undefined ? saveData.timeOfDay : 10.5));
  const [isInsideHouse, setIsInsideHouse] = useState<boolean>(() => !!saveData?.isInsideHouse);

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

  // Modals & Dialogs
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
    const isAnyModalOpen = isPaused || isEditingCharacter || activeStoreCategory !== null || activeNpcDialog !== null;
    if (engineRef.current) {
      engineRef.current.isInputBlocked = isAnyModalOpen;
      if (isAnyModalOpen) {
        engineRef.current.keys = {};
      }
    }
  }, [isPaused, isEditingCharacter, activeStoreCategory, activeNpcDialog]);

  // Save current progress
  const saveProgress = useCallback(() => {
    if (!engineRef.current) return;
    const currentData: GameSaveData = {
      version: 2,
      character: characterConfig,
      money,
      energy,
      completedDeliveries,
      reputation: Math.floor(completedDeliveries * 1.5),
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
      lastSavedAt: Date.now(),
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(currentData));
      setSaveData(currentData);
    } catch {
      // Storage full
    }
  }, [characterConfig, money, energy, completedDeliveries, carColor, carModel, hasCarTuning, timeOfDay, isInsideHouse]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!hasStarted) return;
    const interval = setInterval(() => {
      saveProgress();
    }, 30000);
    return () => clearInterval(interval);
  }, [hasStarted, saveProgress]);

  // Mission Delivery Completion Handler
  const handleMissionDelivered = useCallback(
    (mission: DeliveryMission) => {
      setMoney((m) => m + mission.reward);
      setCompletedDeliveries((d) => d + 1);
      setActiveMission(null);
      if (engineRef.current) {
        engineRef.current.setActiveMission(null);
      }
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
      { name: 'Torre Horizon', pos: [-75, 0, 15] as [number, number, number], client: 'Recepção Horizon', desc: 'Suprimentos de TI' },
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
          isInside ? 'Use a cama para descansar ou o guarda-roupa para trocar de roupa.' : 'Bem-vindo de volta às ruas de Vila Esperança.',
          'info'
        );
      },
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

  // Contextual Interaction Trigger
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

    // Specific Point Interactions
    if (nearbyInteraction) {
      if (nearbyInteraction.type === 'delivery_hub') {
        if (activeMission) {
          addToast('Você já tem uma entrega em andamento!', 'Entregue o pacote no destino marcado no GPS.', 'warning');
        } else {
          generateNewDeliveryMission();
        }
        return;
      }

      if (nearbyInteraction.type === 'player_house_bed') {
        setEnergy(100);
        setTimeOfDay(7.0);
        soundManager.playCashSound();
        addToast('Descanso Realizado!', 'Energia 100% restaurada e amanheceu (07:00).', 'success');
        saveProgress();
        return;
      }

      if (nearbyInteraction.type === 'player_house_wardrobe') {
        setIsEditingCharacter(true);
        return;
      }

      if (nearbyInteraction.type === 'player_house_fridge') {
        setEnergy((e) => Math.min(100, e + 25));
        soundManager.playCashSound();
        addToast('Lanche da Geladeira!', 'Você comeu um lanche gelado (+25% de Energia).', 'success');
        saveProgress();
        return;
      }

      if (nearbyInteraction.type === 'player_house_sofa') {
        setEnergy((e) => Math.min(100, e + 15));
        soundManager.playUiClick();
        addToast('Relaxando no Sofá', 'Você relaxou na sala assistindo TV (+15% de Energia).', 'info');
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
    }

    engineRef.current.triggerInteraction();
  }, [canEnterCar, canExitCar, nearbyInteraction, activeMission, generateNewDeliveryMission, addToast, saveProgress]);

  // Global ESC key listener for Pause Menu
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && hasStarted && !isEditingCharacter) {
        if (activeStoreCategory) {
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
  }, [hasStarted, isEditingCharacter, activeStoreCategory, activeNpcDialog]);

  // Store purchases handler
  const handleBuyItem = (item: StoreItem): boolean => {
    if (money < item.price) return false;
    setMoney((m) => m - item.price);

    if ((item.category === 'padaria' || item.category === 'mercado') && item.effectValue) {
      setEnergy((prev) => Math.min(100, prev + Number(item.effectValue)));
    }

    saveProgress();
    return true;
  };

  // Car Paint
  const handleRepaintCar = (newColorHex: string) => {
    setCarColor(newColorHex);
    if (engineRef.current) {
      engineRef.current.setCarColor(newColorHex);
    }
    saveProgress();
  };

  // Car Purchase at Dealership
  const handleBuyCar = (model: 'popular' | 'gt' | 'suv' | 'moto', price: number) => {
    setCarModel(model);
    if (engineRef.current) {
      engineRef.current.speedMultiplier = getSpeedMultiplier();
    }
    addToast('Novo Carro Adquirido!', `Você comprou o modelo ${model.toUpperCase()}!`, 'success');
    saveProgress();
  };

  // Apply Tuning Kit
  const handleApplyTuning = () => {
    setHasCarTuning(true);
    if (engineRef.current) {
      engineRef.current.speedMultiplier = getSpeedMultiplier();
    }
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
    saveProgress();
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

  // Reset all
  const handleResetAllProgress = () => {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {}
    setMoney(250);
    setEnergy(100);
    setCompletedDeliveries(0);
    setCarColor('#2563eb');
    setCarModel('popular');
    setHasCarTuning(false);
    setTimeOfDay(10.5);
    setIsInsideHouse(false);
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
          energy={energy}
          completedDeliveries={completedDeliveries}
          isDriving={isDriving}
          speedKmH={speedKmH}
          playerPosition={playerPosition}
          playerRotationY={playerRotationY}
          carPosition={carPosition}
          nearbyInteraction={nearbyInteraction}
          canEnterCar={canEnterCar}
          canExitCar={canExitCar}
          activeMission={activeMission}
          timeOfDay={timeOfDay}
          onTriggerInteraction={handleTriggerInteraction}
          onOpenPauseMenu={() => setIsPaused(true)}
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

      {/* Store Modal (Padaria, Mercado, Oficina, Concessionária, Boutique) */}
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
