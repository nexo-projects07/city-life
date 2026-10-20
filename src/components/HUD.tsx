import React, { useEffect, useRef } from 'react';
import { DeliveryMission, InteractionPoint } from '../types';
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
  Home,
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface HUDProps {
  playerName: string;
  money: number;
  energy: number;
  completedDeliveries: number;
  isDriving: boolean;
  speedKmH: number;
  playerPosition: [number, number, number];
  playerRotationY: number;
  carPosition: [number, number, number];
  nearbyInteraction: InteractionPoint | null;
  canEnterCar: boolean;
  canExitCar: boolean;
  activeMission: DeliveryMission | null;
  timeOfDay?: number;
  onTriggerInteraction: () => void;
  onOpenPauseMenu: () => void;
  onHornClick?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  playerName,
  money,
  energy,
  completedDeliveries,
  isDriving,
  speedKmH,
  playerPosition,
  playerRotationY,
  carPosition,
  nearbyInteraction,
  canEnterCar,
  canExitCar,
  activeMission,
  timeOfDay = 10.5,
  onTriggerInteraction,
  onOpenPauseMenu,
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

  // Calculate distance to active mission
  const missionDist = activeMission
    ? Math.round(
        Math.hypot(
          playerPosition[0] - activeMission.targetPosition[0],
          playerPosition[2] - activeMission.targetPosition[2]
        )
      )
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
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText(poi.name, rx - 7, rz - 6);
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
  }, [playerPosition, playerRotationY, carPosition, isDriving, activeMission]);

  // Contextual Interaction Text
  let interactionPrompt: string | null = null;
  if (canEnterCar) {
    interactionPrompt = 'Entrar no Carro';
  } else if (canExitCar) {
    interactionPrompt = 'Sair do Carro';
  } else if (activeMission && missionDist < 4.5) {
    interactionPrompt = `Entregar para ${activeMission.clientName} (+ R$ ${activeMission.reward})`;
  } else if (nearbyInteraction) {
    interactionPrompt = nearbyInteraction.promptText.replace('[E] ', '');
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 select-none font-sans">
      {/* Top Bar: Player Stats & Clock */}
      <div className="flex items-start justify-between w-full">
        {/* Left: Player Profile & Wallet */}
        <div className="pointer-events-auto flex items-center gap-3 bg-slate-950/80 backdrop-blur-sm border border-white/10 px-4 py-2.5 rounded-xl text-white shadow-lg">
          <div className="w-9 h-9 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-sm">
            {playerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-300 leading-tight">
              {playerName}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1 text-emerald-400 font-bold text-sm tabular-nums tracking-wide">
                <Wallet className="w-3.5 h-3.5" />
                R$ {money.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-slate-600 text-xs">·</span>
              <span className="text-slate-400 text-xs flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-amber-400" />
                {completedDeliveries} entregas
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div
                className="bg-amber-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, energy))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Center: Active Mission Banner */}
        {activeMission && (
          <div className="pointer-events-auto hidden sm:flex items-center gap-3 bg-slate-950/85 backdrop-blur-sm border border-amber-500/40 px-4 py-2 rounded-xl text-white shadow-xl animate-in fade-in">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-semibold text-amber-400 flex items-center gap-2">
                <span>ENTREGA FLASH EXPRESS</span>
                <span className="text-slate-400 font-normal">·</span>
                <span className="text-emerald-400 font-bold tabular-nums">
                  + R$ {activeMission.reward}
                </span>
              </div>
              <div className="text-xs text-slate-200">
                Entregar para <span className="font-semibold text-white">{activeMission.clientName}</span> em {activeMission.destinationName}
              </div>
            </div>
            <div className="pl-2 border-l border-white/10 text-right">
              <div className="text-xs text-slate-400">Distância</div>
              <div className="text-sm font-bold text-white tabular-nums">{missionDist}m</div>
            </div>
          </div>
        )}

        {/* Right: In-Game Clock & Quick Action Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Day/Night Clock */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-sm border border-white/10 px-3 py-2 rounded-xl text-xs font-bold text-slate-200">
            {isNight ? (
              <Moon className="w-3.5 h-3.5 text-cyan-400" />
            ) : isSunset ? (
              <Sunset className="w-3.5 h-3.5 text-orange-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="tabular-nums">{clockText}</span>
          </div>

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

      {/* Center Prompt: Contextual Interaction [E] */}
      {interactionPrompt && (
        <div className="pointer-events-auto mx-auto mb-4 animate-bounce">
          <button
            onClick={onTriggerInteraction}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-xl shadow-amber-500/20 flex items-center gap-2 border border-amber-300 transition-all active:scale-95 cursor-pointer"
          >
            <span className="w-6 h-6 rounded bg-slate-950 text-amber-400 font-black text-xs flex items-center justify-center">
              E
            </span>
            <span>{interactionPrompt}</span>
          </button>
        </div>
      )}

      {/* Help Modal Overlay */}
      {showHelp && (
        <div className="pointer-events-auto absolute top-16 right-4 z-30 w-80 bg-slate-950/95 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-2xl text-white text-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-amber-400 uppercase tracking-wider">Comandos do Jogo</span>
            <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-white text-sm font-bold">✕</button>
          </div>
          <div className="space-y-1.5 text-slate-300">
            <div className="flex justify-between"><span className="font-semibold text-white">W A S D</span><span>Mover personagem / Guiar carro</span></div>
            <div className="flex justify-between"><span className="font-semibold text-white">Shift</span><span>Correr (a pé)</span></div>
            <div className="flex justify-between"><span className="font-semibold text-white">Espaço</span><span>Pular (a pé) / Frear (carro)</span></div>
            <div className="flex justify-between"><span className="font-semibold text-white">Mouse / Clique</span><span>Girar Câmera 360°</span></div>
            <div className="flex justify-between"><span className="font-semibold text-white">E</span><span>Interagir / Entrar & Sair / Entrar na Casa</span></div>
            <div className="flex justify-between"><span className="font-semibold text-white">H</span><span>Buzinar (no carro)</span></div>
            <div className="flex justify-between"><span className="font-semibold text-white">ESC</span><span>Menu de Pausa e Salvamento</span></div>
          </div>
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            Pontos de Interesse: <span className="text-cyan-400 font-medium">Sua Casa (CASA)</span>, <span className="text-amber-400 font-medium">Flash Express (HUB)</span>, <span className="text-yellow-400 font-medium">Padaria (PAD)</span>, <span className="text-emerald-400 font-medium">Mercadinho (MER)</span>, <span className="text-blue-400 font-medium">Oficina (OFC)</span> e <span className="text-sky-400 font-medium">Concessionária (CON)</span>.
          </div>
        </div>
      )}

      {/* Bottom Bar: Radar Mini-map (Left) and Speedometer (Right) */}
      <div className="flex items-end justify-between w-full">
        {/* Radar Mini-map */}
        <div className="pointer-events-auto flex flex-col items-start gap-1">
          <div className="relative bg-slate-950/80 backdrop-blur-sm border border-white/10 rounded-2xl p-1.5 shadow-xl overflow-hidden">
            <canvas ref={radarCanvasRef} width={130} height={130} className="rounded-xl block" />
            <div className="absolute top-2 left-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-900/80 px-1.5 py-0.5 rounded">
              GPS
            </div>
          </div>
          <div className="text-[10px] text-slate-400 pl-1 font-medium flex items-center gap-1.5">
            <Navigation className="w-3 h-3 text-cyan-400" />
            <span>Vila Esperança</span>
          </div>
        </div>

        {/* Speedometer (Only when driving) */}
        {isDriving && (
          <div className="pointer-events-auto flex items-center gap-3 bg-slate-950/85 backdrop-blur-sm border border-white/10 px-5 py-3 rounded-2xl shadow-xl text-white">
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
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded text-[11px] font-bold text-amber-400 flex items-center gap-1 cursor-pointer"
                title="Buzinar (H)"
              >
                <span>H</span> Buzina
              </button>
              <button
                onClick={onTriggerInteraction}
                className="px-2.5 py-1 bg-red-600/30 hover:bg-red-600/50 border border-red-500/40 active:scale-95 rounded text-[11px] font-bold text-red-300 flex items-center gap-1 cursor-pointer"
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
