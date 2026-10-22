import React, { useState } from 'react';
import {
  PhoneContact,
  AppRide,
  DeliveryMission,
  InventoryItem,
  StoreItem,
} from '../types';
import {
  X,
  MessageSquare,
  Car,
  Package,
  UtensilsCrossed,
  MapPin,
  CreditCard,
  Wifi,
  Battery,
  ChevronLeft,
  Send,
  Star,
  CheckCircle,
  Clock,
  Heart,
  User,
  ShieldCheck,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface PhoneModalProps {
  money: number;
  timeOfDay: number;
  contacts: PhoneContact[];
  activeRide: AppRide | null;
  activeDelivery: DeliveryMission | null;
  onClose: () => void;
  onSendMessage: (contactId: string, text: string, replyText: string, affinityDelta: number) => void;
  onAcceptRide: (ride: AppRide) => void;
  onCancelRide?: () => void;
  onRequestDelivery: () => void;
  onBuyFoodOnline: (item: StoreItem) => boolean;
  onSetGpsWaypoint: (pos: [number, number, number], name: string) => void;
}

type PhoneTab = 'home' | 'zap' | 'chat' | 'urbano' | 'delivery' | 'food' | 'bank' | 'gps';

const FOOD_ITEMS: StoreItem[] = [
  { id: 'app_pao_queijo', name: 'Combo Pão de Queijo (4 un)', price: 12, description: 'Quentinho e crocante com queijo canastra.', category: 'padaria', effectType: 'hunger', effectValue: 35 },
  { id: 'app_coxinha', name: 'Coxinha Especial com Requeijão', price: 10, description: 'Massa dourada de batata e frango desfiado.', category: 'padaria', effectType: 'hunger', effectValue: 40 },
  { id: 'app_pastel', name: 'Pastel de Carne com Queijo', price: 14, description: 'Pastel sequinho de feira com vinagrete.', category: 'padaria', effectType: 'hunger', effectValue: 45 },
  { id: 'app_acai', name: 'Açaí Completo 500ml', price: 18, description: 'Com granola, banana, leite em pó e leite condensado.', category: 'mercado', effectType: 'energy', effectValue: 50 },
  { id: 'app_marmitex', name: 'Marmitex Executivo Paulista', price: 26, description: 'Arroz, feijão carioca, bife acebolado e fritas.', category: 'mercado', effectType: 'hunger', effectValue: 80 },
  { id: 'app_guarana', name: 'Guaraná Lata Gelado', price: 6, description: 'Bebida brasileira refrescante.', category: 'padaria', effectType: 'energy', effectValue: 20 },
];

const GPS_LOCATIONS: Array<{ name: string; category: string; pos: [number, number, number]; color: string }> = [
  { name: 'Minha Casa (#42)', category: 'Residência', pos: [-25, 0, -21], color: '#38bdf8' },
  { name: 'Shopping Metrópole', category: 'Comércio / Lazer', pos: [75, 0, -18], color: '#f59e0b' },
  { name: 'Hospital & Farmácia Central', category: 'Saúde 24h', pos: [-75, 0, -68], color: '#ef4444' },
  { name: 'Posto de Combustível Brasil', category: 'Combustível / Loja', pos: [75, 0, 80], color: '#eab308' },
  { name: 'Padaria Pão Dourado', category: 'Alimentação', pos: [25, 0, -19], color: '#f97316' },
  { name: 'Mercadinho Vila Nova', category: 'Mercado', pos: [-75, 0, -19], color: '#10b981' },
  { name: 'Oficina Mecânica Auto Car', category: 'Tuning / Reparos', pos: [25, 0, 20], color: '#0284c7' },
  { name: 'Concessionária Auto Prime', category: 'Veículos Novos', pos: [75, 0, 33], color: '#3b82f6' },
  { name: 'Boutique Estilo Carioca', category: 'Roupas', pos: [-75, 0, 30], color: '#a855f7' },
  { name: 'Flash Express Logística', category: 'Emprego', pos: [-25, 0, 17], color: '#ea580c' },
  { name: 'Parada de Ônibus Praça', category: 'Transporte Público', pos: [-9.5, 0, -40], color: '#06b6d4' },
  { name: 'Casa do Beto (Parceiro)', category: 'Amigos', pos: [25, 0, -71], color: '#3b82f6' },
];

export const PhoneModal: React.FC<PhoneModalProps> = ({
  money,
  timeOfDay,
  contacts,
  activeRide,
  activeDelivery,
  onClose,
  onSendMessage,
  onAcceptRide,
  onCancelRide,
  onRequestDelivery,
  onBuyFoodOnline,
  onSetGpsWaypoint,
}) => {
  const [activeTab, setActiveTab] = useState<PhoneTab>('home');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isUrbanoOnline, setIsUrbanoOnline] = useState<boolean>(true);
  const [availableRide, setAvailableRide] = useState<AppRide | null>(null);
  const [orderToast, setOrderToast] = useState<string | null>(null);

  // Time format
  const hours = Math.floor(timeOfDay);
  const minutes = Math.floor((timeOfDay - hours) * 60);
  const clockText = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  const selectedContact = contacts.find((c) => c.id === selectedContactId);

  // Generate simulated Urbano ride request if online
  const generateRideOffer = () => {
    const clients = [
      { name: 'Fernanda Lima', role: 'Executiva', skin: '#ffd1b3', top: '#2563eb', pickup: [-50, 0, 20] as [number, number, number], pAddr: 'Rua das Flores, 140', dest: [75, 0, -18] as [number, number, number], dAddr: 'Shopping Metrópole', fare: 65, tip: 10 },
      { name: 'Rodrigo Santoro', role: 'Médico', skin: '#d29b74', top: '#0284c7', pickup: [25, 0, -50] as [number, number, number], pAddr: 'Av. Brasil, 420', dest: [-75, 0, -68] as [number, number, number], dAddr: 'Hospital Central', fare: 85, tip: 15 },
      { name: 'Beatriz Martins', role: 'Estudante', skin: '#ffd1b3', top: '#ec4899', pickup: [10, 0, 10] as [number, number, number], pAddr: 'Praça Central', dest: [-75, 0, 30] as [number, number, number], dAddr: 'Boutique Estilo Carioca', fare: 45, tip: 5 },
      { name: 'Marcos Vinicius', role: 'Turista', skin: '#794b29', top: '#f97316', pickup: [-75, 0, 80] as [number, number, number], pAddr: 'Vila das Flores, 88', dest: [75, 0, 80] as [number, number, number], dAddr: 'Posto Brasil', fare: 70, tip: 12 },
    ];
    const chosen = clients[Math.floor(Math.random() * clients.length)];
    const newRide: AppRide = {
      id: `ride_${Date.now()}`,
      passengerName: chosen.name,
      passengerRole: chosen.role,
      passengerSkin: chosen.skin,
      passengerTop: chosen.top,
      pickupPosition: chosen.pickup,
      pickupAddress: chosen.pAddr,
      destinationPosition: chosen.dest,
      destinationAddress: chosen.dAddr,
      fare: chosen.fare,
      tip: chosen.tip,
      state: 'driving_to_pickup',
    };
    setAvailableRide(newRide);
    soundManager.playPhoneNotification();
  };

  const handleOpenContact = (id: string) => {
    setSelectedContactId(id);
    setActiveTab('chat');
  };

  const handleSendQuickReply = (text: string, reply: string, affinityDelta: number) => {
    if (!selectedContactId) return;
    onSendMessage(selectedContactId, text, reply, affinityDelta);
    soundManager.playUiClick();
  };

  const handleOrderFood = (item: StoreItem) => {
    const success = onBuyFoodOnline(item);
    if (success) {
      soundManager.playCashSound();
      setOrderToast(`Pedido de ${item.name} a caminho! (+${item.effectValue}% Fome/Energia)`);
      setTimeout(() => setOrderToast(null), 3000);
    } else {
      setOrderToast('Saldo insuficiente para o pedido!');
      setTimeout(() => setOrderToast(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md">
      {/* Smartphone Chassis */}
      <div className="relative w-full max-w-[340px] h-[640px] bg-slate-950 border-[6px] border-slate-800 rounded-[44px] shadow-2xl flex flex-col overflow-hidden text-white font-sans ring-1 ring-white/10">
        {/* Dynamic Island / Speaker Notch */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-30 flex items-center justify-between px-3">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500/40 animate-pulse" />
        </div>

        {/* Status Bar */}
        <div className="pt-3 px-6 pb-2 flex items-center justify-between text-[11px] font-bold text-slate-300 z-20">
          <span>{clockText}</span>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-[10px] font-black tracking-tighter text-emerald-400">5G</span>
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-3.5 h-3.5 fill-slate-200" />
          </div>
        </div>

        {/* Toast inside Phone */}
        {orderToast && (
          <div className="absolute top-12 left-4 right-4 z-40 bg-emerald-500/90 text-slate-950 px-3 py-2 rounded-xl text-xs font-bold shadow-lg animate-in fade-in">
            {orderToast}
          </div>
        )}

        {/* Screen Content Container */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-gradient-to-b from-slate-900 to-slate-950">
          {/* HOME SCREEN */}
          {activeTab === 'home' && (
            <div className="flex-1 flex flex-col justify-between p-5 space-y-4">
              {/* Wallpaper Header Widget */}
              <div className="p-4 bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 rounded-3xl text-left">
                <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400">Vila Esperança RP</div>
                <div className="text-xl font-black text-white mt-0.5">Olá, Morador!</div>
                <div className="text-xs text-slate-300 mt-1 flex items-center gap-1 font-semibold text-emerald-400">
                  <CreditCard className="w-3.5 h-3.5" />
                  R$ {money.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* App Icons Grid */}
              <div className="grid grid-cols-3 gap-4">
                {/* Zap App */}
                <button
                  onClick={() => setActiveTab('zap')}
                  className="flex flex-col items-center gap-1.5 group cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-lg group-active:scale-95 transition-transform">
                    <MessageSquare className="w-7 h-7" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-200">Zap</span>
                </button>

                {/* Urbano App (Uber) */}
                <button
                  onClick={() => setActiveTab('urbano')}
                  className="flex flex-col items-center gap-1.5 group cursor-pointer relative"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 border border-white/10 flex items-center justify-center text-white shadow-lg group-active:scale-95 transition-transform">
                    <Car className="w-7 h-7 text-sky-400" />
                  </div>
                  {activeRide && (
                    <span className="absolute top-0 right-3 w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                  )}
                  <span className="text-[11px] font-semibold text-slate-200">Urbano</span>
                </button>

                {/* Flash Express */}
                <button
                  onClick={() => setActiveTab('delivery')}
                  className="flex flex-col items-center gap-1.5 group cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg group-active:scale-95 transition-transform">
                    <Package className="w-7 h-7" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-200">Flash</span>
                </button>

                {/* Pedir Lanche (iFood) */}
                <button
                  onClick={() => setActiveTab('food')}
                  className="flex flex-col items-center gap-1.5 group cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white shadow-lg group-active:scale-95 transition-transform">
                    <UtensilsCrossed className="w-7 h-7" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-200">Lanches</span>
                </button>

                {/* GPS / Mapa */}
                <button
                  onClick={() => setActiveTab('gps')}
                  className="flex flex-col items-center gap-1.5 group cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white shadow-lg group-active:scale-95 transition-transform">
                    <MapPin className="w-7 h-7" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-200">GPS Mapa</span>
                </button>

                {/* Banco Cidade */}
                <button
                  onClick={() => setActiveTab('bank')}
                  className="flex flex-col items-center gap-1.5 group cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-lg group-active:scale-95 transition-transform">
                    <CreditCard className="w-7 h-7" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-200">Banco</span>
                </button>
              </div>

              {/* Dock bar at bottom of Home */}
              <div className="p-2 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-around">
                <button onClick={() => setActiveTab('zap')} className="p-2 text-emerald-400 hover:text-white cursor-pointer">
                  <MessageSquare className="w-5 h-5" />
                </button>
                <button onClick={() => setActiveTab('urbano')} className="p-2 text-sky-400 hover:text-white cursor-pointer">
                  <Car className="w-5 h-5" />
                </button>
                <button onClick={() => setActiveTab('gps')} className="p-2 text-amber-400 hover:text-white cursor-pointer">
                  <MapPin className="w-5 h-5" />
                </button>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-400 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* ZAP CONTACTS LIST */}
          {activeTab === 'zap' && (
            <div className="flex-1 flex flex-col text-left">
              <div className="p-4 bg-emerald-700 text-white flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2">
                  <button onClick={() => setActiveTab('home')} className="p-1 text-white hover:bg-emerald-600 rounded-lg cursor-pointer">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="font-bold text-sm">Zap Conversas</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-800 p-2">
                {contacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleOpenContact(contact.id)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-slate-800/60 rounded-xl text-left transition-colors cursor-pointer"
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white shadow-md text-sm shrink-0"
                      style={{ backgroundColor: contact.avatarColor }}
                    >
                      {contact.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white truncate">{contact.name}</span>
                        {contact.isRomanceCandidate && (
                          <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500 shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] text-amber-400 font-medium">{contact.role}</div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {contact.chatHistory[contact.chatHistory.length - 1]?.text || 'Toque para conversar'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CHAT VIEW */}
          {activeTab === 'chat' && selectedContact && (
            <div className="flex-1 flex flex-col text-left">
              {/* Chat Header */}
              <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center gap-2">
                <button onClick={() => setActiveTab('zap')} className="p-1 text-slate-300 hover:text-white rounded cursor-pointer">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
                  style={{ backgroundColor: selectedContact.avatarColor }}
                >
                  {selectedContact.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-white truncate">{selectedContact.name}</div>
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span>Afinidade: {selectedContact.affinity}%</span>
                    <span>·</span>
                    <span className="capitalize">{selectedContact.relationshipStatus}</span>
                  </div>
                </div>
              </div>

              {/* Chat History */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {selectedContact.chatHistory.map((msg) => (
                  <div
                    key={msg.id}
                    className={`max-w-[85%] p-2.5 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === 'player'
                        ? 'ml-auto bg-emerald-600 text-white rounded-tr-none'
                        : 'mr-auto bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700'
                    }`}
                  >
                    <div>{msg.text}</div>
                    <div className="text-[9px] text-white/50 text-right mt-1">{msg.timestamp}</div>
                  </div>
                ))}
              </div>

              {/* Quick Replies Options */}
              {selectedContact.quickReplies && selectedContact.quickReplies.length > 0 && (
                <div className="p-2 bg-slate-900/90 border-t border-slate-800 space-y-1.5">
                  <div className="text-[10px] text-slate-400 font-bold px-1">Respostas Disponíveis:</div>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {selectedContact.quickReplies.map((qr, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendQuickReply(qr.text, qr.response, qr.affinityDelta)}
                        className="w-full text-left p-2 bg-slate-800 hover:bg-slate-700 active:scale-98 rounded-xl text-xs text-slate-200 border border-slate-700 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <span className="truncate">{qr.text}</span>
                        <span className="text-[10px] text-emerald-400 font-bold shrink-0 ml-2">
                          +{qr.affinityDelta} afinidade
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* URBANO (APP DE CORRIDAS / UBER) */}
          {activeTab === 'urbano' && (
            <div className="flex-1 flex flex-col p-4 space-y-4 text-left overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => setActiveTab('home')} className="p-1 text-slate-300 hover:text-white rounded cursor-pointer">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="font-black text-sm tracking-tight text-white flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-sky-400" />
                    URBANO DRIVER
                  </span>
                </div>
                <button
                  onClick={() => setIsUrbanoOnline(!isUrbanoOnline)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    isUrbanoOnline
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isUrbanoOnline ? '● Online' : '○ Offline'}
                </button>
              </div>

              {/* Ongoing Ride Card */}
              {activeRide ? (
                <div className="p-4 bg-slate-900 border-2 border-sky-500/60 rounded-2xl space-y-3 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-sky-400 tracking-wider">Corrida em Andamento</span>
                    <span className="text-xs font-bold text-emerald-400 tabular-nums">R$ {activeRide.fare} + R$ {activeRide.tip} gorjeta</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm"
                      style={{ backgroundColor: activeRide.passengerTop }}
                    >
                      {activeRide.passengerName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">{activeRide.passengerName}</div>
                      <div className="text-[10px] text-slate-400">{activeRide.passengerRole} · 5.0 ★</div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                    <div className="flex items-start gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400">Embarque:</span>
                        <div className="font-semibold text-white">{activeRide.pickupAddress}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 mt-1 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400">Destino:</span>
                        <div className="font-semibold text-white">{activeRide.destinationAddress}</div>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] font-medium text-sky-300 bg-sky-950/40 p-2 rounded-xl text-center">
                    {activeRide.state === 'driving_to_pickup'
                      ? 'Dirija até o passageiro no ponto marcado no GPS.'
                      : 'Passageiro a bordo! Leve-o em segurança ao destino.'}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-slate-300">
                    Fique online para receber chamadas de passageiros na cidade.
                  </div>

                  {isUrbanoOnline && !availableRide && (
                    <button
                      onClick={generateRideOffer}
                      className="w-full py-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Car className="w-4 h-4" />
                      Buscar Novas Corridas na Região
                    </button>
                  )}

                  {/* Incoming ride request card */}
                  {availableRide && (
                    <div className="p-4 bg-slate-900 border border-sky-500/80 rounded-2xl space-y-3 animate-in slide-in-from-bottom shadow-2xl">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Nova Solicitação</span>
                        <span className="text-xs font-black text-emerald-400 tabular-nums">R$ {availableRide.fare}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm"
                          style={{ backgroundColor: availableRide.passengerTop }}
                        >
                          {availableRide.passengerName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-white">{availableRide.passengerName}</div>
                          <div className="text-[10px] text-slate-400">{availableRide.passengerRole} · 4.9 ★</div>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs text-slate-300 pt-2 border-t border-slate-800">
                        <div><span className="text-slate-400">Coleta:</span> {availableRide.pickupAddress}</div>
                        <div><span className="text-slate-400">Destino:</span> {availableRide.destinationAddress}</div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setAvailableRide(null)}
                          className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-xs rounded-xl font-semibold cursor-pointer"
                        >
                          Recusar
                        </button>
                        <button
                          onClick={() => {
                            onAcceptRide(availableRide);
                            setAvailableRide(null);
                          }}
                          className="flex-1 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 font-bold text-xs rounded-xl text-slate-950 shadow-md cursor-pointer"
                        >
                          Aceitar Corrida
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* FLASH EXPRESS COURIER APP */}
          {activeTab === 'delivery' && (
            <div className="flex-1 flex flex-col p-4 space-y-4 text-left overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => setActiveTab('home')} className="p-1 text-slate-300 hover:text-white rounded cursor-pointer">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="font-black text-sm tracking-tight text-white flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-amber-500" />
                    FLASH EXPRESS
                  </span>
                </div>
              </div>

              {activeDelivery ? (
                <div className="p-4 bg-slate-900 border border-amber-500/50 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-400">Entrega Ativa</span>
                    <span className="text-xs font-black text-emerald-400 tabular-nums">+ R$ {activeDelivery.reward}</span>
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">{activeDelivery.destinationName}</div>
                    <div className="text-[11px] text-slate-300">Cliente: {activeDelivery.clientName}</div>
                    <div className="text-[10px] text-slate-400 mt-1">Item: {activeDelivery.itemDescription}</div>
                  </div>
                  <div className="p-2 bg-amber-500/10 rounded-xl text-[11px] text-amber-300 text-center font-medium">
                    Siga o marcador amarelo no minimapa até o destino.
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs text-slate-300">
                  <p>Sem entregas pendentes no momento. Retire novos pacotes na Central Flash Express ou clique abaixo.</p>
                  <button
                    onClick={() => {
                      onRequestDelivery();
                      soundManager.playCashSound();
                    }}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg cursor-pointer"
                  >
                    Aceitar Próxima Encomenda Agora
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PEDIR LANCHE (FOOD DELIVERY) */}
          {activeTab === 'food' && (
            <div className="flex-1 flex flex-col p-4 space-y-3 text-left overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => setActiveTab('home')} className="p-1 text-slate-300 hover:text-white rounded cursor-pointer">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="font-bold text-sm text-white flex items-center gap-1.5">
                    <UtensilsCrossed className="w-4 h-4 text-red-500" />
                    Pedir Lanche
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {FOOD_ITEMS.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 shadow-md"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-white truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{item.description}</div>
                      <div className="text-[11px] font-bold text-emerald-400 mt-1">R$ {item.price}</div>
                    </div>
                    <button
                      onClick={() => handleOrderFood(item)}
                      className="px-3 py-2 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shrink-0 cursor-pointer"
                    >
                      Pedir
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GPS & MAPA */}
          {activeTab === 'gps' && (
            <div className="flex-1 flex flex-col p-4 space-y-3 text-left overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => setActiveTab('home')} className="p-1 text-slate-300 hover:text-white rounded cursor-pointer">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="font-bold text-sm text-white flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-cyan-400" />
                    Pontos & GPS
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {GPS_LOCATIONS.map((loc, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-xs text-white">{loc.name}</div>
                      <div className="text-[10px] text-slate-400">{loc.category}</div>
                    </div>
                    <button
                      onClick={() => {
                        onSetGpsWaypoint(loc.pos, loc.name);
                        soundManager.playUiClick();
                        setOrderToast(`GPS marcado para: ${loc.name}`);
                        setTimeout(() => setOrderToast(null), 2500);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                    >
                      Traçar Rota
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BANCO CIDADE */}
          {activeTab === 'bank' && (
            <div className="flex-1 flex flex-col p-4 space-y-4 text-left overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => setActiveTab('home')} className="p-1 text-slate-300 hover:text-white rounded cursor-pointer">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="font-bold text-sm text-white flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-purple-400" />
                    Banco Cidade
                  </span>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-purple-900/60 to-slate-900 border border-purple-500/40 rounded-3xl space-y-2">
                <span className="text-[10px] uppercase font-bold text-purple-300">Saldo Disponível em Conta</span>
                <div className="text-2xl font-black text-white tabular-nums tracking-tight">
                  R$ {money.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-slate-400">Chave PIX: morador@citylife.rp</div>
              </div>

              <div className="space-y-2 text-xs">
                <span className="font-bold text-slate-300">Extrato Recente</span>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Flash Express Courier</div>
                    <div className="text-[10px] text-slate-400">Recebimento automático</div>
                  </div>
                  <span className="text-emerald-400 font-bold">+ R$ 120,00</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Corrida Urbano Driver</div>
                    <div className="text-[10px] text-slate-400">Transporte de passageiro</div>
                  </div>
                  <span className="text-emerald-400 font-bold">+ R$ 75,00</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Smartphone Bottom Home Bar */}
        <div className="py-2.5 flex justify-center bg-slate-950">
          <button
            onClick={() => setActiveTab('home')}
            className="w-32 h-1 bg-slate-500 hover:bg-white rounded-full transition-colors cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
