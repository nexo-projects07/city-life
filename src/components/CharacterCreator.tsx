import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CharacterConfig } from '../types';
import { createCharacterRig, CharacterRig } from '../game/models';
import { Sparkles, User, Palette, Shirt, Play } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface CharacterCreatorProps {
  initialConfig?: CharacterConfig;
  onComplete: (config: CharacterConfig) => void;
}

const SKIN_TONES = [
  { name: 'Claro', value: '#ffd1b3' },
  { name: 'Moreno Claro', value: '#d29b74' },
  { name: 'Moreno Médio', value: '#b57954' },
  { name: 'Negro', value: '#794b29' },
  { name: 'Retinto', value: '#402613' },
];

const HAIR_STYLES = [
  { id: 'curto', label: 'Curto Clássico' },
  { id: 'degrade', label: 'Degradê / Fade' },
  { id: 'dreads', label: 'Dreads' },
  { id: 'longo', label: 'Cabelo Longo' },
  { id: 'raspado', label: 'Militar / Raspado' },
] as const;

const HAIR_COLORS = [
  { name: 'Preto', value: '#1a1105' },
  { name: 'Castanho', value: '#4a2e18' },
  { name: 'Loiro', value: '#d4af37' },
  { name: 'Ruivo', value: '#8b3a1a' },
  { name: 'Platinado', value: '#e2e8f0' },
];

const TOP_COLORS = [
  { name: 'Azul Brasil', value: '#2563eb' },
  { name: 'Preto Urbano', value: '#18181b' },
  { name: 'Branco Clássico', value: '#f8fafc' },
  { name: 'Verde Militar', value: '#15803d' },
  { name: 'Vermelho Paixão', value: '#dc2626' },
  { name: 'Amarelo Canário', value: '#eab308' },
];

const BOTTOM_COLORS = [
  { name: 'Jeans Azul', value: '#1d4ed8' },
  { name: 'Preto', value: '#0f172a' },
  { name: 'Cinza Mescla', value: '#475569' },
  { name: 'Bege Caqui', value: '#a89f91' },
];

export const CharacterCreator: React.FC<CharacterCreatorProps> = ({ initialConfig, onComplete }) => {
  const [config, setConfig] = useState<CharacterConfig>(
    initialConfig || {
      name: 'Morador da Cidade',
      skinTone: '#d29b74',
      hairStyle: 'curto',
      hairColor: '#1a1105',
      topType: 'camiseta',
      topColor: '#2563eb',
      bottomType: 'jeans',
      bottomColor: '#0f172a',
      shoesColor: '#ffffff',
    }
  );

  const previewMountRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<CharacterRig | null>(null);

  // 3D Character Preview in the creation screen
  useEffect(() => {
    const mount = previewMountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 320;
    const height = mount.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Deep modern slate

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(0, 1.2, 3.2);
    camera.lookAt(0, 1.0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // Studio Lighting
    const keyLight = new THREE.DirectionalLight(0xffedd5, 1.8);
    keyLight.position.set(2, 4, 3);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.0);
    fillLight.position.set(-3, 2, -1);
    scene.add(fillLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.6);
    scene.add(hemiLight);

    // Initial character
    let rig = createCharacterRig(config);
    scene.add(rig.group);
    rigRef.current = rig;

    let animId: number;
    let clock = new THREE.Clock();

    const animatePreview = () => {
      animId = requestAnimationFrame(animatePreview);
      const t = clock.getElapsedTime();

      // Smooth slow 360 degree showcase rotation
      if (rigRef.current) {
        rigRef.current.group.rotation.y = t * 0.45;
        // Subtle idle pose animation
        rigRef.current.updateAnimation(0, false, false, t);
      }

      renderer.render(scene, camera);
    };

    animatePreview();

    return () => {
      cancelAnimationFrame(animId);
      try {
        renderer.forceContextLoss?.();
        renderer.dispose();
      } catch {}
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update 3D preview when config changes
  useEffect(() => {
    if (rigRef.current) {
      const parent = rigRef.current.group.parent;
      if (parent) {
        const curRot = rigRef.current.group.rotation.y;
        parent.remove(rigRef.current.group);
        const newRig = createCharacterRig(config);
        newRig.group.rotation.y = curRot;
        parent.add(newRig.group);
        rigRef.current = newRig;
      }
    }
  }, [config]);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playCashSound();
    onComplete(config);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row my-auto">
        {/* Left Side: 3D Live Interactive Avatar */}
        <div className="w-full md:w-5/12 bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-r border-slate-800 relative">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 text-xs font-semibold text-amber-400 tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>PRÉ-VISUALIZAÇÃO 3D</span>
          </div>

          <div ref={previewMountRef} className="w-full h-80 md:h-96 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center" />

          <p className="text-xs text-slate-400 mt-2 text-center">
            Gire e personalize o visual do seu morador em tempo real
          </p>
        </div>

        {/* Right Side: Customization Form */}
        <div className="w-full md:w-7/12 p-6 md:p-8 flex flex-col justify-between overflow-y-auto max-h-[85vh]">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  CITYLIFE RP
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Criação de Personagem e Cidadania Brasileira
                </p>
              </div>
              <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-medium">
                Vila Esperança
              </div>
            </div>

            <form onSubmit={handleStart} className="space-y-5">
              {/* Character Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  Nome do Cidadão
                </label>
                <input
                  type="text"
                  required
                  maxLength={24}
                  value={config.name}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                  placeholder="Ex: Carlos Silva, Marina Rocha..."
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm transition-colors"
                />
              </div>

              {/* Skin Tone */}
              <div>
                <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5 text-emerald-400" />
                  Tom de Pele
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {SKIN_TONES.map((tone) => (
                    <button
                      type="button"
                      key={tone.value}
                      onClick={() => setConfig({ ...config, skinTone: tone.value })}
                      className={`h-9 rounded-lg flex items-center justify-center border-2 transition-all ${
                        config.skinTone === tone.value
                          ? 'border-white scale-105 shadow-md shadow-black'
                          : 'border-transparent hover:opacity-90'
                      }`}
                      style={{ backgroundColor: tone.value }}
                      title={tone.name}
                    />
                  ))}
                </div>
              </div>

              {/* Hair Style */}
              <div>
                <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
                  Estilo de Cabelo
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {HAIR_STYLES.map((hair) => (
                    <button
                      type="button"
                      key={hair.id}
                      onClick={() => setConfig({ ...config, hairStyle: hair.id })}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all text-left ${
                        config.hairStyle === hair.id
                          ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                          : 'bg-slate-800/70 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {hair.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hair Color */}
              <div>
                <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
                  Cor do Cabelo
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {HAIR_COLORS.map((hc) => (
                    <button
                      type="button"
                      key={hc.value}
                      onClick={() => setConfig({ ...config, hairColor: hc.value })}
                      className={`h-8 rounded-lg border-2 transition-all ${
                        config.hairColor === hc.value
                          ? 'border-white scale-105'
                          : 'border-transparent hover:opacity-80'
                      }`}
                      style={{ backgroundColor: hc.value }}
                      title={hc.name}
                    />
                  ))}
                </div>
              </div>

              {/* Clothes Color (Shirt) */}
              <div>
                <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Shirt className="w-3.5 h-3.5 text-blue-400" />
                  Cor da Camiseta
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {TOP_COLORS.map((tc) => (
                    <button
                      type="button"
                      key={tc.value}
                      onClick={() => setConfig({ ...config, topColor: tc.value })}
                      className={`h-8 rounded-lg border-2 transition-all ${
                        config.topColor === tc.value
                          ? 'border-white scale-105'
                          : 'border-transparent hover:opacity-80'
                      }`}
                      style={{ backgroundColor: tc.value }}
                      title={tc.name}
                    />
                  ))}
                </div>
              </div>

              {/* Pants Color */}
              <div>
                <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
                  Cor da Calça / Bermuda
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {BOTTOM_COLORS.map((bc) => (
                    <button
                      type="button"
                      key={bc.value}
                      onClick={() => setConfig({ ...config, bottomColor: bc.value })}
                      className={`h-8 rounded-lg border-2 transition-all ${
                        config.bottomColor === bc.value
                          ? 'border-white scale-105'
                          : 'border-transparent hover:opacity-80'
                      }`}
                      style={{ backgroundColor: bc.value }}
                      title={bc.name}
                    />
                  ))}
                </div>
              </div>

              {/* Start Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  INICIAR VIDA EM CITYLIFE RP
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
