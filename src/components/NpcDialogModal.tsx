import React, { useState } from 'react';
import { NPCData } from '../types';
import { MessageSquare, Briefcase, ShoppingCart, Car, ArrowRight, X } from 'lucide-react';

interface NpcDialogModalProps {
  npc: NPCData;
  onClose: () => void;
  onAcceptDeliveryMission?: () => void;
  onOpenStore?: (category: 'padaria' | 'mercado' | 'oficina' | 'concessionaria' | 'roupas') => void;
}

export const NpcDialogModal: React.FC<NpcDialogModalProps> = ({
  npc,
  onClose,
  onAcceptDeliveryMission,
  onOpenStore,
}) => {
  const [dialogIndex, setDialogIndex] = useState(0);

  const currentLine = npc.dialog[dialogIndex] || npc.dialog[0];
  const hasMoreLines = dialogIndex < npc.dialog.length - 1;

  const handleNextLine = () => {
    if (hasMoreLines) {
      setDialogIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm pointer-events-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-5 text-white space-y-4 animate-in slide-in-from-bottom duration-200">
        {/* Header with NPC info */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl border border-white/20 flex items-center justify-center text-white font-bold text-sm shadow-md"
              style={{ backgroundColor: npc.topColor }}
            >
              <div
                className="w-5 h-5 rounded-full border border-white/40"
                style={{ backgroundColor: npc.skinTone }}
              />
            </div>
            <div>
              <div className="font-bold text-sm text-white flex items-center gap-2">
                {npc.name}
              </div>
              <div className="text-[11px] text-amber-400 font-medium">
                {npc.role}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dialogue Bubble */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-200 leading-relaxed min-h-[4rem] flex items-center">
          "{currentLine}"
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Specific Role Actions */}
          {npc.id === 'npc_tiago' && onAcceptDeliveryMission && (
            <button
              onClick={() => {
                onAcceptDeliveryMission();
                onClose();
              }}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Briefcase className="w-3.5 h-3.5 fill-slate-950" />
              Pegar Encomenda Agora
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

          {/* Dialog Navigation */}
          <button
            onClick={handleNextLine}
            className="ml-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>{hasMoreLines ? 'Continuar' : 'Fechar conversa'}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
