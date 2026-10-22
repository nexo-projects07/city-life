import React, { useState } from 'react';
import { NPCData, StoreCategory } from '../types';
import { Briefcase, ShoppingCart, Car, ArrowRight, X, Heart, Sparkles, Building, Fuel, Cross } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface NpcDialogModalProps {
  npc: NPCData;
  onClose: () => void;
  onAcceptDeliveryMission?: () => void;
  onOpenStore?: (category: StoreCategory) => void;
  onAffinityChange?: (npcId: string, delta: number) => void;
}

export const NpcDialogModal: React.FC<NpcDialogModalProps> = ({
  npc,
  onClose,
  onAcceptDeliveryMission,
  onOpenStore,
  onAffinityChange,
}) => {
  const [dialogIndex, setDialogIndex] = useState(0);
  const [customReply, setCustomReply] = useState<string | null>(null);
  const [affinityNotice, setAffinityNotice] = useState<string | null>(null);

  const currentLine = customReply || (npc.dialog[dialogIndex] || npc.dialog[0]);
  const hasMoreLines = !customReply && dialogIndex < npc.dialog.length - 1;

  const handleNextLine = () => {
    if (customReply) {
      setCustomReply(null);
      return;
    }
    if (hasMoreLines) {
      setDialogIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handleSelectOption = (opt: {
    text: string;
    replyText: string;
    affinityBonus?: number;
    action?: string;
    storeCategory?: StoreCategory;
  }) => {
    soundManager.playUiClick();
    setCustomReply(opt.replyText);

    if (opt.affinityBonus && onAffinityChange) {
      onAffinityChange(npc.id, opt.affinityBonus);
      setAffinityNotice(`+${opt.affinityBonus} Afinidade!`);
      setTimeout(() => setAffinityNotice(null), 2500);
    }

    if (opt.action === 'accept_delivery' && onAcceptDeliveryMission) {
      setTimeout(() => {
        onAcceptDeliveryMission();
        onClose();
      }, 900);
    }

    if (opt.action === 'open_store' && opt.storeCategory && onOpenStore) {
      setTimeout(() => {
        onOpenStore(opt.storeCategory!);
        onClose();
      }, 900);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md pointer-events-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-5 text-white space-y-4 animate-in slide-in-from-bottom duration-200">
        {/* Header with NPC info & Relationship Status */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl border border-white/20 flex items-center justify-center text-white font-black text-sm shadow-md"
              style={{ backgroundColor: npc.topColor }}
            >
              <div
                className="w-5 h-5 rounded-full border border-white/40"
                style={{ backgroundColor: npc.skinTone }}
              />
            </div>
            <div>
              <div className="font-bold text-sm text-white flex items-center gap-2">
                <span>{npc.name}</span>
                {npc.isRomanceOption && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/20">
                    <Heart className="w-3 h-3 fill-pink-400" />
                    Paquera
                  </span>
                )}
              </div>
              <div className="text-[11px] text-amber-400 font-medium">
                {npc.role}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {affinityNotice && (
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30 animate-in fade-in">
                {affinityNotice}
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Relationship Meter */}
        {npc.affinity !== undefined && (
          <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Nível de Relação: <span className="text-white font-bold capitalize">{npc.relationshipStatus || 'Amigo'}</span>
            </span>
            <div className="flex items-center gap-2">
              <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-pink-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, npc.affinity)}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-amber-400 tabular-nums">{npc.affinity}%</span>
            </div>
          </div>
        )}

        {/* Dialogue Bubble */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl text-sm text-slate-200 leading-relaxed min-h-[4.5rem] flex items-center">
          "{currentLine}"
        </div>

        {/* Interactive Dialogue Choices */}
        {npc.options && npc.options.length > 0 && !customReply && (
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-bold text-slate-400">O que você responde?</div>
            <div className="grid grid-cols-1 gap-1.5">
              {npc.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(opt)}
                  className="w-full p-2.5 bg-slate-800 hover:bg-slate-700/80 text-left rounded-xl text-xs font-medium text-slate-100 border border-slate-700/80 hover:border-amber-400/50 flex items-center justify-between gap-2 transition-all cursor-pointer active:scale-98"
                >
                  <span>"{opt.text}"</span>
                  {opt.affinityBonus && (
                    <span className="text-[10px] text-emerald-400 font-bold shrink-0">
                      +{opt.affinityBonus} afinidade
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons for Key Stores */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800">
          {npc.id === 'npc_tiago' && onAcceptDeliveryMission && (
            <button
              onClick={() => {
                onAcceptDeliveryMission();
                onClose();
              }}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Briefcase className="w-3.5 h-3.5 fill-slate-950" />
              Pegar Encomenda Flash
            </button>
          )}

          {npc.id === 'npc_dona_maria' && onOpenStore && (
            <button
              onClick={() => {
                onOpenStore('mercado');
                onClose();
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Abrir Mercadinho
            </button>
          )}

          {npc.id === 'npc_antenor' && onOpenStore && (
            <button
              onClick={() => {
                onOpenStore('concessionaria');
                onClose();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Car className="w-3.5 h-3.5" />
              Ver Carros da Auto Prime
            </button>
          )}

          {npc.id === 'npc_gabriela' && onOpenStore && (
            <button
              onClick={() => {
                onOpenStore('shopping');
                onClose();
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Building className="w-3.5 h-3.5" />
              Lojas do Shopping
            </button>
          )}

          {/* Dialog Navigation */}
          <button
            onClick={handleNextLine}
            className="ml-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>{hasMoreLines ? 'Continuar' : 'Fechar conversa'}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
