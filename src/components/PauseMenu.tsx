import React, { useState } from 'react';
import { Play, Save, RotateCcw, Volume2, MousePointer, User, Check } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface PauseMenuProps {
  onResume: () => void;
  onSaveGame: () => void;
  onResetPosition: () => void;
  onResetCar?: () => void;
  onStartSenaiDemo?: () => void;
  onOpenCharacterCreator: () => void;
  onResetAllProgress: () => void;
  mouseSensitivity: number;
  onSensitivityChange: (val: number) => void;
  renderMode?: '3d' | '2d';
  onToggleRenderMode?: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onSaveGame,
  onResetPosition,
  onResetCar,
  onStartSenaiDemo,
  onOpenCharacterCreator,
  onResetAllProgress,
  mouseSensitivity,
  onSensitivityChange,
  renderMode = '3d',
  onToggleRenderMode,
}) => {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [volume, setVolume] = useState(soundManager.getVolume());
  const [confirmReset, setConfirmReset] = useState(false);

  const handleSave = () => {
    onSaveGame();
    soundManager.playCashSound();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleVolumeChange = (newVal: number) => {
    setVolume(newVal);
    soundManager.setVolume(newVal);
    soundManager.playFootstep();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 text-white space-y-6">
        {/* Title */}
        <div className="text-center border-b border-slate-800 pb-4">
          <h2 className="text-2xl font-black tracking-tight text-white">CITYLIFE RP</h2>
          <p className="text-xs text-amber-400 font-medium tracking-wide mt-1">JOGO PAUSADO</p>
        </div>

        {/* Save confirmation banner */}
        {saveSuccess && (
          <div className="flex items-center justify-center gap-2 p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold animate-in fade-in">
            <Check className="w-4 h-4" />
            Progresso salvo com sucesso no navegador!
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:scale-98 font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            CONTINUAR JOGO
          </button>

          {onToggleRenderMode && (
            <button
              onClick={onToggleRenderMode}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 active:scale-98 font-semibold text-sm rounded-xl border border-slate-700 transition-all flex items-center justify-between px-4 cursor-pointer"
            >
              <span className="text-xs text-slate-300">Modo Gráfico</span>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {renderMode === '3d' ? '3D Three.js' : '2D Canvas (Otimizado)'}
              </span>
            </button>
          )}

          <button
            onClick={handleSave}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 active:scale-98 font-semibold text-sm rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4 text-emerald-400" />
            Salvar Jogo Agora
          </button>

          {onStartSenaiDemo && (
            <button
              onClick={onStartSenaiDemo}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 active:scale-98 font-bold text-sm rounded-xl border border-blue-400/40 transition-all flex items-center justify-center gap-2 text-white shadow-lg shadow-blue-900/30 cursor-pointer"
            >
              <Check className="w-4 h-4 text-amber-300" />
              Modo Demonstração SENAI 🎓
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onResetPosition}
              className="py-2.5 px-3 bg-slate-800/80 hover:bg-slate-700 active:scale-98 font-semibold text-xs rounded-xl border border-slate-700/80 transition-all flex items-center justify-center gap-1.5 text-slate-300 cursor-pointer"
              title="Destravar Personagem"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              Destravar Jogador
            </button>

            {onResetCar && (
              <button
                onClick={onResetCar}
                className="py-2.5 px-3 bg-slate-800/80 hover:bg-slate-700 active:scale-98 font-semibold text-xs rounded-xl border border-slate-700/80 transition-all flex items-center justify-center gap-1.5 text-slate-300 cursor-pointer"
                title="Resgatar Veículo Preso"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                Resgatar Carro
              </button>
            )}
          </div>

          <button
            onClick={onOpenCharacterCreator}
            className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-700 active:scale-98 font-semibold text-sm rounded-xl border border-slate-700/80 transition-all flex items-center justify-center gap-2 text-slate-300 cursor-pointer"
          >
            <User className="w-4 h-4 text-purple-400" />
            Modificar Aparência do Personagem
          </button>
        </div>

        {/* Settings Sliders */}
        <div className="pt-2 border-t border-slate-800 space-y-4 text-xs">
          {/* Volume */}
          <div>
            <div className="flex justify-between text-slate-300 font-medium mb-1.5">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                Volume dos Efeitos Sonoros
              </span>
              <span className="tabular-nums font-bold text-white">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Mouse Sensitivity */}
          <div>
            <div className="flex justify-between text-slate-300 font-medium mb-1.5">
              <span className="flex items-center gap-1.5">
                <MousePointer className="w-3.5 h-3.5 text-emerald-400" />
                Sensibilidade do Mouse (Câmera)
              </span>
              <span className="tabular-nums font-bold text-white">
                {Math.round(mouseSensitivity * 2000)}
              </span>
            </div>
            <input
              type="range"
              min="0.001"
              max="0.006"
              step="0.0005"
              value={mouseSensitivity}
              onChange={(e) => onSensitivityChange(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Reset Progress Danger Zone */}
        <div className="pt-2 border-t border-slate-800">
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="w-full py-2 text-xs text-red-400/80 hover:text-red-400 text-center font-medium transition-colors cursor-pointer"
            >
              Resetar Todo o Progresso Salvo
            </button>
          ) : (
            <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl space-y-2 text-center">
              <div className="text-xs text-red-300">Tem certeza? Todos os dados serão apagados.</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 py-1.5 bg-slate-800 text-xs rounded-lg font-medium hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={onResetAllProgress}
                  className="flex-1 py-1.5 bg-red-600 text-xs rounded-lg font-bold text-white hover:bg-red-500"
                >
                  Confirmar Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
