import React, { useEffect, useRef } from 'react';
import { DeliveryMission, InteractionPoint, AppRide, PlayerNeeds } from '../types';
import {
  Wallet,
  Zap,
  Volume2,
  VolumeX,
  Pause,
  Navigation,
  Package,
  CheckCircle,
  HelpCircle,
  Sun,
  Moon,
  Sunset,
  Smartphone,
  Flame,
  ShieldAlert,
  Heart,
  Droplets,
  Bed,
  Utensils,
  Car,
  Star,
  Bus,
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface HUDProps {
  playerName: string;
  money: number;
  needs: PlayerNeeds;
  completedDeliveries: number;
  completedRides: number;
  wantedLevel: number;
  isDriving: boolean;
  speedKmH: number;
  playerPosition: [number, number, number];
  playerRotationY: number;
  carPosition: [number, number, number];
  nearbyInteraction: InteractionPoint | null;
  canEnterCar: boolean;
  canExitCar: boolean;
  activeMission: DeliveryMission | null;
  activeRide: AppRide | null;
  isRidingBus?: boolean;
  timeOfDay?: number;
  gamepadInfo?: { isConnected: boolean; name: string };
  senaiDemo?: { isActive: boolean; step: number; instruction: string } | null;
  onStopSenaiDemo?: () => void;
  onUnstuckPlayer?: () => void;
  onUnstuckCar?: () => void;
  onTriggerInteraction: () => void;
  onOpenPauseMenu: () => void;
  onOpenPhone: () => void;
  onPunchClick: () => void;
  onHornClick?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  playerName,
  money,
  needs,
  completedDeliveries,
  completedRides,
  wantedLevel,
  isDriving,
  speedKmH,
  playerPosition,
  playerRotationY,
  carPosition,
  nearbyInteraction,
  canEnterCar,
  canExitCar,
  activeMission,
  activeRide,
  isRidingBus = false,
  timeOfDay = 10.5,
  gamepadInfo,
  senaiDemo,
  onStopSenaiDemo,
  onUnstuckPlayer,
  onUnstuckCar,
  onTriggerInteraction,
  onOpenPauseMenu,
  onOpenPhone,
  onPunchClick,
  onHornClick,
}) => {
  const [isMuted, setIsMuted] = React.useState(soundManager.getMuted());
  const [showHelp, setShowHelp] = React.useState(false);
  const radarCanvasRef = useRef<HTMLCanvasElement>(null);

  const toggleMute = () => {
    const next = !isMuted;
    soundManager.setMuted(next);
    setIsMuted(next);
  };

  // Format in-game clock (e.g. 14:25)
  const hours = Math.floor(timeOfDay);
  const minutes = Math.floor((timeOfDay - hours) * 60);
  const clockText = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  const isNight = timeOfDay >= 19.5 || timeOfDay < 5.5;
  const isSunset = timeOfDay >= 17.5 && timeOfDay < 19.5;

  // Calculate distance to active delivery mission
  const missionDist = activeMission
    ? Math.round(
        Math.hypot(
          playerPosition[0] - activeMission.targetPosition[0],
          playerPosition[2] - activeMission.targetPosition[2]
        )
      )
    : 0;

  // Calculate distance to active app ride
  const rideTargetPos = activeRide
    ? activeRide.state === 'driving_to_pickup'
      ? activeRide.pickupPosition
      : activeRide.destinationPosition
    : null;
  const rideDist = rideTargetPos
    ? Math.round(Math.hypot(playerPosition[0] - rideTargetPos[0], playerPosition[2] - rideTargetPos[2]))
    : 0;

  // Render 2D Mini-map Radar
  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const mapScale = 0.55;

    // Clear background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, size, size);

    // Range rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    [30, 60, 90].forEach((r) => {
      ctx.beginPath();
      ctx.arc(center, center, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(center, 0);
    ctx.lineTo(center, size);
    ctx.moveTo(0, center);
    ctx.lineTo(size, center);
    ctx.stroke();

    const toRadar = (wx: number, wz: number): [number, number] => {
      const dx = (wx - playerPosition[0]) * mapScale;
      const dz = (wz - playerPosition[2]) * mapScale;
      return [center + dx, center + dz];
    };

    // Points of Interest on Radar
    const pois = [
      { name: 'CASA', x: -25, z: -25, color: '#38bdf8' },
      { name: 'SHOP', x: 75, z: -25, color: '#f59e0b' },
      { name: 'HOSP', x: -75, z: -75, color: '#ef4444' },
      { name: 'POST', x: 75, z: 75, color: '#eab308' },
      { name: 'HUB', x: -25, z: 25, color: '#f97316' },
      { name: 'PAD', x: 25, z: -25, color: '#eab308' },
      { name: 'MER', x: -75, z: -25, color: '#16a34a' },
      { name: 'OFC', x: 25, z: 25, color: '#0284c7' },
      { name: 'CON', x: 75, z: 25, color: '#3b82f6' },
      { name: 'ROU', x: -75, z: 25, color: '#a855f7' },
    ];

    pois.forEach((poi) => {
      const [rx, rz] = toRadar(poi.x, poi.z);
      if (rx >= 4 && rx <= size - 4 && rz >= 4 && rz <= size - 4) {
        ctx.fillStyle = poi.color;
        ctx.beginPath();
        ctx.arc(rx, rz, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '8px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText(poi.name, rx - 8, rz - 6);
      }
    });

    // Car icon on radar
    if (!isDriving) {
      const [cx, cz] = toRadar(carPosition[0], carPosition[2]);
      if (cx >= 4 && cx <= size - 4 && cz >= 4 && cz <= size - 4) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(cx - 3, cz - 3, 6, 6);
      }
    }

    // Active Mission Waypoint on Radar
    if (activeMission) {
      const [mx, mz] = toRadar(activeMission.targetPosition[0], activeMission.targetPosition[2]);
      const clampedX = Math.max(6, Math.min(size - 6, mx));
      const clampedZ = Math.max(6, Math.min(size - 6, mz));

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(clampedX, clampedZ, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Active App Ride Waypoint on Radar
    if (rideTargetPos) {
      const [rx, rz] = toRadar(rideTargetPos[0], rideTargetPos[2]);
      const clampedX = Math.max(6, Math.min(size - 6, rx));
      const clampedZ = Math.max(6, Math.min(size - 6, rz));

      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(clampedX, clampedZ, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Player arrow at center
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(-playerRotationY);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }, [playerPosition, playerRotationY, carPosition, isDriving, activeMission, activeRide]);

  // Contextual Interaction Text
  let interactionPrompt: string | null = null;
  if (canEnterCar) {
    interactionPrompt = 'Entrar no Carro';
  } else if (canExitCar) {
    interactionPrompt = 'Sair do Carro';
  } else if (isRidingBus) {
    interactionPrompt = 'Desembarcar do Ônibus';
  } else if (activeMission && missionDist < 4.5) {
    interactionPrompt = `Entregar para ${activeMission.clientName} (+ R$ ${activeMission.reward})`;
  } else if (activeRide && activeRide.state === 'driving_to_pickup' && rideDist < 5.0) {
    interactionPrompt = `Embarcar ${activeRide.passengerName}`;
  } else if (activeRide && activeRide.state === 'driving_to_dest' && rideDist < 5.0) {
    interactionPrompt = `Concluir Corrida (+ R$ ${activeRide.fare + activeRide.tip})`;
  } else if (nearbyInteraction) {
    interactionPrompt = nearbyInteraction.promptText.replace('[E] ', '');
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-5 select-none font-sans">
      {/* Top Bar: Player Stats, Needs & Clock */}
      <div className="flex items-start justify-between w-full gap-3">
        {/* Left: Player Profile, Wallet & Needs */}
        <div className="pointer-events-auto flex flex-col gap-2 bg-slate-950/85 backdrop-blur-md border border-white/10 p-3 rounded-2xl text-white shadow-2xl max-w-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">
              {playerName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-200 truncate">
                {playerName}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 text-emerald-400 font-black text-sm tabular-nums tracking-wide">
                  <Wallet className="w-3.5 h-3.5" />
                  R$ {money.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Player Needs Bars (The Sims style: Fome, Energia, Higiene, Sono, Vida) */}
          <div className="space-y-1.5 pt-1 border-t border-slate-800 text-[10px]">
            {/* Vida / Health */}
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1 font-semibold text-rose-400">
                <Heart className="w-3 h-3 fill-rose-500/30 text-rose-400" />
                Vida
              </span>
              <div className="w-28 bg-slate-800 rounded-full h-1.5 overflow-hidden ml-2">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, needs.health))}%` }}
                />
              </div>
            </div>

            {/* Fome / Hunger */}
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1 font-semibold text-amber-400">
                <Utensils className="w-3 h-3 text-amber-400" />
                Fome
              </span>
              <div className="w-28 bg-slate-800 rounded-full h-1.5 overflow-hidden ml-2">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, needs.hunger))}%` }}
                />
              </div>
            </div>

            {/* Energia */}
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1 font-semibold text-yellow-300">
                <Zap className="w-3 h-3 text-yellow-300 fill-yellow-300" />
                Energia
              </span>
              <div className="w-28 bg-slate-800 rounded-full h-1.5 overflow-hidden ml-2">
                <div
                  className="bg-yellow-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, needs.energy))}%` }}
                />
              </div>
            </div>

            {/* Higiene */}
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1 font-semibold text-cyan-400">
                <Droplets className="w-3 h-3 text-cyan-400" />
                Higiene
              </span>
              <div className="w-28 bg-slate-800 rounded-full h-1.5 overflow-hidden ml-2">
                <div
                  className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, needs.hygiene))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Center: Active Mission / Ride / Wanted Alerts */}
        <div className="flex flex-col items-center gap-2 max-w-lg w-full">
          {/* SENAI Demonstration Mode Active Banner */}
          {senaiDemo?.isActive && (
            <div className="pointer-events-auto w-full bg-gradient-to-r from-blue-900/95 via-indigo-950/95 to-blue-900/95 border-2 border-blue-400 p-3 rounded-2xl text-white shadow-2xl animate-in fade-in">
              <div className="flex items-center justify-between border-b border-blue-400/30 pb-1.5 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-white font-black text-xs flex items-center justify-center">
                    {senaiDemo.step}
                  </span>
                  <span className="text-xs font-black tracking-wider text-amber-300 uppercase">
                    DEMONSTRAÇÃO SENAI · ETAPA {senaiDemo.step}/6
                  </span>
                </div>
                {onStopSenaiDemo && (
                  <button
                    onClick={onStopSenaiDemo}
                    className="text-[10px] text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded cursor-pointer transition-colors"
                  >
                    Encerrar Demo
                  </button>
                )}
              </div>
              <div className="text-xs text-slate-100 font-medium leading-relaxed">
                {senaiDemo.instruction}
              </div>
            </div>
          )}

          {/* Gamepad Connection Badge */}
          {gamepadInfo?.isConnected && (
            <div className="pointer-events-auto flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/50 px-3 py-1 rounded-full text-[11px] font-bold text-emerald-300 shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>🎮 {gamepadInfo.name}</span>
            </div>
          )}

          {/* Police Wanted Stars */}
          {wantedLevel > 0 && (
            <div className="pointer-events-auto flex items-center gap-1.5 bg-red-950/90 border border-red-500 px-4 py-1.5 rounded-full text-white shadow-xl animate-pulse">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span className="text-xs font-black tracking-wider text-red-200 uppercase">PROCURADO:</span>
              <div className="flex gap-0.5">
                {[1, 2, 3].map((star) => (
                  <Star
                    key={star}
                    className={`w-3.5 h-3.5 ${
                      star <= wantedLevel ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Active Delivery Banner */}
          {activeMission && (
            <div className="pointer-events-auto flex items-center gap-3 bg-slate-950/90 backdrop-blur-md border border-amber-500/50 px-4 py-2 rounded-2xl text-white shadow-xl animate-in fade-in">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <div className="text-left min-w-0">
                <div className="text-xs font-black text-amber-400 flex items-center gap-2">
                  <span>FLASH EXPRESS</span>
                  <span className="text-slate-400 font-normal">·</span>
                  <span className="text-emerald-400 font-black tabular-nums">+ R$ {activeMission.reward}</span>
                </div>
                <div className="text-xs text-slate-200 truncate">
                  Entregar para <span className="font-bold text-white">{activeMission.clientName}</span> em {activeMission.destinationName}
                </div>
              </div>
              <div className="pl-3 border-l border-white/10 text-right shrink-0">
                <div className="text-[10px] text-slate-400 uppercase">Distância</div>
                <div className="text-sm font-black text-white tabular-nums">{missionDist}m</div>
              </div>
            </div>
          )}

          {/* Active App Ride (Urbano) Banner */}
          {activeRide && (
            <div className="pointer-events-auto flex items-center gap-3 bg-slate-950/90 backdrop-blur-md border border-sky-500/50 px-4 py-2 rounded-2xl text-white shadow-xl animate-in fade-in">
              <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                <Car className="w-4 h-4" />
              </div>
              <div className="text-left min-w-0">
                <div className="text-xs font-black text-sky-400 flex items-center gap-2">
                  <span>URBANO DRIVER</span>
                  <span className="text-slate-400 font-normal">·</span>
                  <span className="text-emerald-400 font-black tabular-nums">R$ {activeRide.fare + activeRide.tip}</span>
                </div>
                <div className="text-xs text-slate-200 truncate">
                  {activeRide.state === 'driving_to_pickup'
                    ? `Buscar ${activeRide.passengerName} em ${activeRide.pickupAddress}`
                    : `Levar ${activeRide.passengerName} até ${activeRide.destinationAddress}`}
                </div>
              </div>
              <div className="pl-3 border-l border-white/10 text-right shrink-0">
                <div className="text-[10px] text-slate-400 uppercase">Distância</div>
                <div className="text-sm font-black text-white tabular-nums">{rideDist}m</div>
              </div>
            </div>
          )}

          {/* Bus Riding Indicator */}
          {isRidingBus && (
            <div className="pointer-events-auto flex items-center gap-2.5 bg-sky-950/90 border border-sky-400/50 px-4 py-2 rounded-2xl text-white shadow-xl">
              <Bus className="w-4 h-4 text-sky-400" />
              <div className="text-xs font-bold">A bordo do Ônibus Municipal (Linha 101 - Circular)</div>
            </div>
          )}
        </div>

        {/* Right: In-Game Clock & Quick Action Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Day/Night Clock */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-sm border border-white/10 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 shadow-md">
            {isNight ? (
              <Moon className="w-3.5 h-3.5 text-cyan-400" />
            ) : isSunset ? (
              <Sunset className="w-3.5 h-3.5 text-orange-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="tabular-nums tracking-wide">{clockText}</span>
          </div>

          {/* Smartphone Toggle Button [P] */}
          <button
            onClick={onOpenPhone}
            className="p-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white rounded-xl shadow-lg transition-transform flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Abrir Smartphone (P)"
          >
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">Celular</span>
          </button>

          {/* Punch Attack Button [F] */}
          {!isDriving && (
            <button
              onClick={() => {
                onPunchClick();
                soundManager.playPunch();
              }}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-400 border border-amber-500/30 rounded-xl transition-all flex items-center gap-1 text-xs font-bold cursor-pointer"
              title="Golpear / Soco (F)"
            >
              <Flame className="w-4 h-4 fill-amber-400/20" />
              <span className="hidden sm:inline">Soco [F]</span>
            </button>
          )}

          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-2.5 bg-slate-950/80 backdrop-blur-sm border border-white/10 hover:border-white/20 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
            title="Controles e Dicas"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={toggleMute}
            className="p-2.5 bg-slate-950/80 backdrop-blur-sm border border-white/10 hover:border-white/20 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
            title={isMuted ? 'Desmutar Som' : 'Mutar Som'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={onOpenPauseMenu}
            className="px-3.5 py-2.5 bg-slate-950/80 backdrop-blur-sm border border-white/10 hover:border-white/20 text-slate-200 hover:text-white rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>PAUSA</span>
          </button>
        </div>
      </div>

      {/* Center Prompt: Contextual Interaction [E] / [X] */}
      {interactionPrompt && (
        <div className="pointer-events-auto mx-auto mb-4 animate-bounce">
          <button
            onClick={onTriggerInteraction}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-2xl shadow-2xl shadow-amber-500/30 flex items-center gap-2.5 border border-amber-300 transition-all active:scale-95 cursor-pointer"
          >
            <div className="flex items-center gap-1">
              <span className="w-7 h-7 rounded-lg bg-slate-950 text-amber-400 font-black text-xs flex items-center justify-center">
                E
              </span>
              {gamepadInfo?.isConnected && (
                <span className="w-7 h-7 rounded-lg bg-blue-950 border border-blue-400 text-blue-300 font-black text-xs flex items-center justify-center" title="Botão X ou Quadrado no controle">
                  X
                </span>
              )}
            </div>
            <span>{interactionPrompt}</span>
          </button>
        </div>
      )}

      {/* Help Modal Overlay */}
      {showHelp && (
        <div className="pointer-events-auto absolute top-16 right-4 z-30 w-84 bg-slate-950/95 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-2xl text-white text-xs space-y-2.5 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-amber-400 uppercase tracking-wider">Controles & Guia do Jogo</span>
            <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer">✕</button>
          </div>
          <div className="space-y-1.5 text-slate-300">
            <div className="flex justify-between"><span className="font-semibold text-white">W A S D</span><span>Mover personagem / Guiar carro</span></div>
            <div className="flex justify-between"><span className="font-semibold text-white">Shift</span><span>Correr (a pé)</span></div>
            <div className="flex justify-between"><span className="font-semibold text-white">Espaço</span><span>Pular (a pé) / Freio de mão (carro)</span></div>
            <div className="flex justify-between"><span className="font-semibold text-white">E</span><span>Interagir (Lojas, NPCs, Carro, Casa, Ônibus)</span></div>
            <div className="flex justify-between"><span className="font-semibold text-white">P</span><span>Abrir Celular Smartphone</span></div>
            <div className="flex justify-between"><span className="font-semibold text-white">F</span><span>Golpe / Soco</span></div>
            <div className="flex justify-between"><span className="font-semibold text-white">H</span><span>Buzina do Carro</span></div>
            <div className="flex justify-between"><span className="font-semibold text-white">ESC</span><span>Pausa & Salvar</span></div>
          </div>
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            Visite o <strong className="text-cyan-400">Shopping Metrópole</strong>, recupere energia dormindo em sua <strong className="text-amber-400">Casa</strong>, tome banho no chuveiro para higiene e faça corridas no app <strong className="text-sky-400">Urbano</strong>!
          </div>
        </div>
      )}

      {/* Bottom Bar: Radar Mini-map (Left) and Speedometer (Right) */}
      <div className="flex items-end justify-between w-full">
        {/* Radar Mini-map */}
        <div className="pointer-events-auto flex flex-col items-start gap-1">
          <div className="relative bg-slate-950/85 backdrop-blur-md border border-white/10 rounded-2xl p-1.5 shadow-2xl overflow-hidden">
            <canvas ref={radarCanvasRef} width={135} height={135} className="rounded-xl block" />
            <div className="absolute top-2 left-2 text-[9px] font-bold text-slate-300 uppercase tracking-widest bg-slate-900/80 px-1.5 py-0.5 rounded">
              GPS
            </div>
          </div>
          <div className="text-[10px] text-slate-400 pl-1 font-medium flex items-center gap-1.5">
            <Navigation className="w-3 h-3 text-cyan-400" />
            <span>Vila Esperança RP</span>
          </div>
        </div>

        {/* Speedometer (Only when driving) */}
        {isDriving && (
          <div className="pointer-events-auto flex items-center gap-3 bg-slate-950/90 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl shadow-2xl text-white animate-in slide-in-from-bottom">
            <div className="text-right">
              <div className="text-3xl font-black tabular-nums tracking-tight text-white flex items-baseline justify-end gap-1">
                {Math.abs(speedKmH)}
                <span className="text-xs font-semibold text-slate-400">km/h</span>
              </div>
              <div className="flex items-center justify-end gap-1.5 text-[11px] font-bold text-slate-400 mt-0.5">
                <span className={speedKmH < -1 ? 'text-amber-400' : 'text-slate-600'}>R</span>
                <span className={Math.abs(speedKmH) <= 1 ? 'text-amber-400' : 'text-slate-600'}>N</span>
                <span className={speedKmH > 1 ? 'text-emerald-400' : 'text-slate-600'}>D</span>
              </div>
            </div>

            <div className="pl-3 border-l border-white/10 flex flex-col gap-1.5">
              <button
                onClick={() => {
                  soundManager.playHorn();
                  onHornClick?.();
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-lg text-[11px] font-bold text-amber-400 flex items-center gap-1 cursor-pointer"
                title="Buzinar (H)"
              >
                <span>H</span> Buzina
              </button>
              <button
                onClick={onTriggerInteraction}
                className="px-2.5 py-1 bg-red-600/30 hover:bg-red-600/50 border border-red-500/40 active:scale-95 rounded-lg text-[11px] font-bold text-red-300 flex items-center gap-1 cursor-pointer"
                title="Sair do Carro (E)"
              >
                <span>E</span> Sair
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
