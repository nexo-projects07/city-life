import React, { useState } from 'react';
import { StoreCategory, StoreItem, CharacterConfig } from '../types';
import {
  X,
  ShoppingBag,
  Coffee,
  Wrench,
  Sparkles,
  Check,
  Car,
  Apple,
  Zap,
  Building,
  Heart,
  Fuel,
  ShieldAlert,
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface StoreModalProps {
  category: StoreCategory;
  money: number;
  characterConfig: CharacterConfig;
  carColor: string;
  hasCarTuning?: boolean;
  carModel?: string;
  onClose: () => void;
  onBuyItem: (item: StoreItem) => boolean;
  onRepaintCar: (newColorHex: string) => void;
  onUpdateCharacterClothes: (updates: Partial<CharacterConfig>) => void;
  onBuyCar?: (model: 'popular' | 'gt' | 'suv', price: number) => void;
  onApplyTuning?: () => void;
}

const PADARIA_ITEMS: StoreItem[] = [
  { id: 'pao_de_queijo', name: 'Pão de Queijo Mineiro', price: 8, description: 'Quentinho e macio, queijo canastra legítimo.', category: 'padaria', effectType: 'hunger', effectValue: 25 },
  { id: 'coxinha', name: 'Coxinha com Catupiry', price: 10, description: 'Crocante por fora e cremosa por dentro.', category: 'padaria', effectType: 'hunger', effectValue: 35 },
  { id: 'cafe_pingado', name: 'Café Pingado no Copo', price: 4, description: 'Café forte brasileiro com toque de leite quente.', category: 'padaria', effectType: 'energy', effectValue: 20 },
  { id: 'guarana', name: 'Guaraná Gelado (Lata)', price: 6, description: 'Bebida de guaraná da Amazônia.', category: 'padaria', effectType: 'energy', effectValue: 15 },
];

const MERCADO_ITEMS: StoreItem[] = [
  { id: 'agua_mineral', name: 'Água Mineral da Serra (500ml)', price: 4, description: 'Puríssima e gelada, mata a sede e reidrata.', category: 'mercado', effectType: 'energy', effectValue: 20 },
  { id: 'maca', name: 'Maçã Vermelha Fresca', price: 3, description: 'Fruta fresca colhida no interior.', category: 'mercado', effectType: 'hunger', effectValue: 15 },
  { id: 'barra_cereal', name: 'Barra de Cereal com Castanhas', price: 6, description: 'Energia rápida e prática para entregadores.', category: 'mercado', effectType: 'energy', effectValue: 30 },
  { id: 'sanduiche', name: 'Sanduíche Natural de Frango', price: 14, description: 'Pão integral com peito de frango desfiado.', category: 'mercado', effectType: 'hunger', effectValue: 50 },
  { id: 'energetico', name: 'Energético Nitro Bull (Lata)', price: 12, description: 'Dose potente de cafeína e taurina.', category: 'mercado', effectType: 'energy', effectValue: 60 },
];

const SHOPPING_ITEMS: StoreItem[] = [
  { id: 'shop_combo', name: 'Combo Praça de Alimentação', price: 38, description: 'Hambúrguer duplo artesanal, batata rústica e refrigerante.', category: 'shopping', effectType: 'hunger', effectValue: 75 },
  { id: 'shop_smartwatch', name: 'Smartwatch Digital Pro', price: 320, description: 'Relógio moderno com GPS integrado e contador de passos.', category: 'shopping', effectType: 'inventory' },
  { id: 'shop_sneakers', name: 'Tênis Streetwear Carioca', price: 210, description: 'Amortecimento esportivo ideal para caminhadas longas.', category: 'shopping', effectType: 'inventory' },
  { id: 'shop_headphone', name: 'Fone Bluetooth Noise Cancelling', price: 175, description: 'Áudio imersivo sem fio para ouvir música pela cidade.', category: 'shopping', effectType: 'energy', effectValue: 25 },
  { id: 'shop_jaqueta', name: 'Jaqueta Bomber Urbana', price: 280, description: 'Tecido premium com corte moderno da coleção de inverno.', category: 'shopping', effectType: 'inventory' },
];

const HOSPITAL_ITEMS: StoreItem[] = [
  { id: 'hosp_curativo', name: 'Curativo Rápido e Analgésico', price: 15, description: 'Alívio imediato para pequenos machucados.', category: 'hospital', effectType: 'health', effectValue: 25 },
  { id: 'hosp_kit', name: 'Kit de Primeiros Socorros', price: 45, description: 'Bandagens, esparadrapo, iodo e gaze esterilizada.', category: 'hospital', effectType: 'health', effectValue: 60 },
  { id: 'hosp_vitamina', name: 'Complexo Vitamínico Revitalizante', price: 28, description: 'Restaura a imunidade e combate o cansaço físico.', category: 'hospital', effectType: 'energy', effectValue: 50 },
  { id: 'hosp_consulta', name: 'Atendimento Médico Completo', price: 120, description: 'Check-up com médico plantonista. Recupera 100% de Vida.', category: 'hospital', effectType: 'health', effectValue: 100 },
];

const POSTO_ITEMS: StoreItem[] = [
  { id: 'posto_gasolina', name: 'Tanque Cheio de Gasolina Aditivada', price: 85, description: 'Combustível de alta performance com aditivos de limpeza.', category: 'posto', effectType: 'car_repair' },
  { id: 'posto_cafe', name: 'Café Expresso da Conveniência', price: 6, description: 'Café forte e quente para revigorar na estrada.', category: 'posto', effectType: 'energy', effectValue: 25 },
  { id: 'posto_agua', name: 'Água Mineral Gelada com Gás', price: 5, description: 'Refrescante garrafa de 500ml.', category: 'posto', effectType: 'energy', effectValue: 15 },
  { id: 'posto_palheta', name: 'Kit Palhetas Limpadoras e Cera', price: 35, description: 'Manutenção rápida dos vidros e brilho da lataria.', category: 'posto', effectType: 'car_repair' },
];

const CAR_PAINTS = [
  { name: 'Vermelho Fogo', hex: '#dc2626', price: 100 },
  { name: 'Azul Cobalto', hex: '#2563eb', price: 100 },
  { name: 'Amarelo Ouro', hex: '#eab308', price: 100 },
  { name: 'Preto Black Piano', hex: '#09090b', price: 100 },
  { name: 'Prata Titânio', hex: '#94a3b8', price: 100 },
  { name: 'Branco Pérola', hex: '#f8fafc', price: 100 },
  { name: 'Verde Esmeralda', hex: '#059669', price: 100 },
  { name: 'Laranja Racing', hex: '#ea580c', price: 100 },
];

const CAR_MODELS = [
  { id: 'popular', name: 'Hatch Popular 1.0 Flex', price: 550, desc: 'Econômico e ágil no trânsito diário da cidade.', speedBonus: 'Padrão' },
  { id: 'gt', name: 'Coupé GT Esportivo Turbo', price: 1200, desc: 'Motor turbo esportivo com aceleração superior (+25% vel.).', speedBonus: '+25% Vel.' },
  { id: 'suv', name: 'SUV Urbano 4x4 Luxo', price: 1800, desc: 'Máximo conforto, suspensão reforçada e blindagem leve.', speedBonus: '+35% Vel.' },
] as const;

const CLOTHING_COLORS = [
  { name: 'Azul Royal', hex: '#1d4ed8' },
  { name: 'Preto Noite', hex: '#09090b' },
  { name: 'Branco Neve', hex: '#ffffff' },
  { name: 'Verde Floresta', hex: '#15803d' },
  { name: 'Vermelho Carmim', hex: '#b91c1c' },
  { name: 'Cinza Grafite', hex: '#334155' },
];

export const StoreModal: React.FC<StoreModalProps> = ({
  category,
  money,
  characterConfig,
  carColor,
  hasCarTuning = false,
  carModel = 'popular',
  onClose,
  onBuyItem,
  onRepaintCar,
  onUpdateCharacterClothes,
  onBuyCar,
  onApplyTuning,
}) => {
  const [selectedTopColor, setSelectedTopColor] = useState(characterConfig.topColor);
  const [selectedBottomColor, setSelectedBottomColor] = useState(characterConfig.bottomColor);
  const [purchasedMessage, setPurchasedMessage] = useState<string | null>(null);

  const getStoreTitle = () => {
    switch (category) {
      case 'padaria':
        return { name: 'Padaria Pão Dourado', desc: 'Salgados, café e lanches tradicionais para recarregar sua energia e fome' };
      case 'mercado':
        return { name: 'Mercadinho Vila Nova', desc: 'Bebidas geladas, energéticos e alimentos rápidos' };
      case 'shopping':
        return { name: 'Shopping Center Metrópole', desc: 'Lojas de departamento, eletrônicos e praça de alimentação' };
      case 'hospital':
        return { name: 'Hospital & Farmácia Central', desc: 'Atendimento médico, curativos e primeiros socorros' };
      case 'posto':
        return { name: 'Posto de Combustível Brasil', desc: 'Abastecimento de veículos e conveniência BR' };
      case 'oficina':
        return { name: 'Oficina Mecânica Auto Car', desc: 'Pinturas esportivas, revisões e kit de tuning' };
      case 'concessionaria':
        return { name: 'Concessionária Auto Prime', desc: 'Veículos novos e esportivos zero km para sua garagem' };
      case 'roupas':
        return { name: 'Boutique Estilo Carioca', desc: 'Moda urbana, camisetas e bermudas exclusivas' };
      default:
        return { name: 'Comércio Local', desc: 'Produtos e serviços de Vila Esperança' };
    }
  };

  const storeInfo = getStoreTitle();

  const handleBuyConsumable = (item: StoreItem) => {
    const success = onBuyItem(item);
    if (success) {
      soundManager.playCashSound();
      const effectDesc = item.effectType ? `(+${item.effectValue}% ${item.effectType.toUpperCase()})` : '';
      setPurchasedMessage(`Você comprou ${item.name}! ${effectDesc}`);
      setTimeout(() => setPurchasedMessage(null), 2500);
    } else {
      setPurchasedMessage('Saldo insuficiente! Trabalhe como entregador ou motorista.');
      setTimeout(() => setPurchasedMessage(null), 2500);
    }
  };

  const handleRepaint = (paint: typeof CAR_PAINTS[0]) => {
    if (money < paint.price) {
      setPurchasedMessage(`Saldo insuficiente para a pintura! Custa R$ ${paint.price}`);
      setTimeout(() => setPurchasedMessage(null), 2500);
      return;
    }
    const success = onBuyItem({
      id: `paint_${paint.hex}`,
      name: `Pintura ${paint.name}`,
      price: paint.price,
      description: 'Nova cor para seu carro',
      category: 'oficina',
      effectType: 'custom_color',
      effectValue: paint.hex,
    });
    if (success) {
      onRepaintCar(paint.hex);
      soundManager.playCashSound();
      setPurchasedMessage(`Carro pintado com a cor ${paint.name}!`);
      setTimeout(() => setPurchasedMessage(null), 2500);
    }
  };

  const handleTuningPurchase = () => {
    const price = 350;
    if (hasCarTuning) {
      setPurchasedMessage('Seu veículo já possui o Kit de Tuning instalado!');
      setTimeout(() => setPurchasedMessage(null), 2500);
      return;
    }
    if (money < price) {
      setPurchasedMessage(`Saldo insuficiente! O Kit de Tuning custa R$ ${price}`);
      setTimeout(() => setPurchasedMessage(null), 2500);
      return;
    }
    const success = onBuyItem({
      id: 'car_tuning_kit',
      name: 'Kit de Tuning Esportivo',
      price,
      description: 'Aumento de 20% na velocidade máxima e aceleração',
      category: 'oficina',
      effectType: 'car_tuning',
    });
    if (success) {
      onApplyTuning?.();
      soundManager.playCashSound();
      setPurchasedMessage('Kit de Tuning Esportivo instalado com sucesso!');
      setTimeout(() => setPurchasedMessage(null), 2500);
    }
  };

  const handleDealershipBuy = (model: typeof CAR_MODELS[number]) => {
    if (money < model.price) {
      setPurchasedMessage(`Saldo insuficiente! O modelo ${model.name} custa R$ ${model.price}`);
      setTimeout(() => setPurchasedMessage(null), 2500);
      return;
    }
    const success = onBuyItem({
      id: `car_model_${model.id}`,
      name: `Veículo ${model.name}`,
      price: model.price,
      description: model.desc,
      category: 'concessionaria',
      effectType: 'buy_car',
      effectValue: model.id,
    });
    if (success) {
      onBuyCar?.(model.id as 'popular' | 'gt' | 'suv', model.price);
      soundManager.playCashSound();
      setPurchasedMessage(`Parabéns! Você adquiriu o ${model.name}!`);
      setTimeout(() => setPurchasedMessage(null), 2500);
    }
  };

  const handleApplyClothes = () => {
    const price = 40;
    if (money < price) {
      setPurchasedMessage(`Saldo insuficiente! Mudar as roupas custa R$ ${price}`);
      setTimeout(() => setPurchasedMessage(null), 2500);
      return;
    }
    const success = onBuyItem({
      id: 'clothes_purchase',
      name: 'Aparência & Roupas Novas',
      price,
      description: 'Camiseta e calça novas da boutique',
      category: 'roupas',
    });
    if (success) {
      onUpdateCharacterClothes({
        topColor: selectedTopColor,
        bottomColor: selectedBottomColor,
      });
      soundManager.playCashSound();
      setPurchasedMessage('Visual atualizado com sucesso!');
      setTimeout(() => setPurchasedMessage(null), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              {category === 'padaria' && <Coffee className="w-5 h-5" />}
              {category === 'mercado' && <Apple className="w-5 h-5" />}
              {category === 'shopping' && <Building className="w-5 h-5" />}
              {category === 'hospital' && <Heart className="w-5 h-5 text-red-400" />}
              {category === 'posto' && <Fuel className="w-5 h-5 text-yellow-400" />}
              {category === 'oficina' && <Wrench className="w-5 h-5 text-blue-400" />}
              {category === 'concessionaria' && <Car className="w-5 h-5 text-sky-400" />}
              {category === 'roupas' && <ShoppingBag className="w-5 h-5 text-purple-400" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{storeInfo.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{storeInfo.desc}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback message banner */}
        {purchasedMessage && (
          <div className="p-2.5 bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-300 text-xs font-semibold text-center animate-in fade-in">
            {purchasedMessage}
          </div>
        )}

        {/* Store Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {/* Padaria List */}
          {category === 'padaria' && (
            <div className="space-y-2.5">
              {PADARIA_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-white">{item.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{item.description}</div>
                    <div className="text-xs font-bold text-emerald-400 mt-1">R$ {item.price.toFixed(2)}</div>
                  </div>
                  <button
                    onClick={() => handleBuyConsumable(item)}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer shrink-0"
                  >
                    Comprar
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Mercado List */}
          {category === 'mercado' && (
            <div className="space-y-2.5">
              {MERCADO_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-white">{item.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{item.description}</div>
                    <div className="text-xs font-bold text-emerald-400 mt-1">R$ {item.price.toFixed(2)}</div>
                  </div>
                  <button
                    onClick={() => handleBuyConsumable(item)}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer shrink-0"
                  >
                    Comprar
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Shopping Metrópole List */}
          {category === 'shopping' && (
            <div className="space-y-2.5">
              {SHOPPING_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-950/70 border border-slate-800 hover:border-purple-500/40 rounded-2xl flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-white">{item.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{item.description}</div>
                    <div className="text-xs font-bold text-emerald-400 mt-1">R$ {item.price.toFixed(2)}</div>
                  </div>
                  <button
                    onClick={() => handleBuyConsumable(item)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer shrink-0"
                  >
                    Comprar
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Hospital List */}
          {category === 'hospital' && (
            <div className="space-y-2.5">
              {HOSPITAL_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-950/70 border border-slate-800 hover:border-red-500/40 rounded-2xl flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-white flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-red-400" />
                      {item.name}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{item.description}</div>
                    <div className="text-xs font-bold text-emerald-400 mt-1">R$ {item.price.toFixed(2)}</div>
                  </div>
                  <button
                    onClick={() => handleBuyConsumable(item)}
                    className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer shrink-0"
                  >
                    Adquirir
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Posto List */}
          {category === 'posto' && (
            <div className="space-y-2.5">
              {POSTO_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-950/70 border border-slate-800 hover:border-yellow-500/40 rounded-2xl flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-white">{item.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{item.description}</div>
                    <div className="text-xs font-bold text-emerald-400 mt-1">R$ {item.price.toFixed(2)}</div>
                  </div>
                  <button
                    onClick={() => handleBuyConsumable(item)}
                    className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer shrink-0"
                  >
                    Abastecer
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Oficina List */}
          {category === 'oficina' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-950/40 border border-blue-500/30 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-sm flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Kit de Tuning Esportivo
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    Aumenta em 20% a velocidade máxima e arrancada do seu veículo.
                  </div>
                  <div className="text-[11px] text-amber-400 font-bold mt-1">
                    {hasCarTuning ? 'STATUS: INSTALADO' : 'R$ 350,00'}
                  </div>
                </div>
                <button
                  disabled={hasCarTuning}
                  onClick={handleTuningPurchase}
                  className={`px-4 py-2 font-bold text-xs rounded-xl transition-all ${
                    hasCarTuning
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-md shadow-blue-500/20 cursor-pointer'
                  }`}
                >
                  {hasCarTuning ? 'Instalado' : 'Instalar'}
                </button>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Pintura Personalizada (R$ 100 cada)
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {CAR_PAINTS.map((paint) => {
                    const isCurrent = carColor.toLowerCase() === paint.hex.toLowerCase();
                    return (
                      <button
                        key={paint.hex}
                        onClick={() => handleRepaint(paint)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all text-left cursor-pointer ${
                          isCurrent
                            ? 'bg-slate-800/80 border-amber-500 shadow-md'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className="w-7 h-7 rounded-xl border border-white/20 shrink-0 shadow-inner flex items-center justify-center"
                          style={{ backgroundColor: paint.hex }}
                        >
                          {isCurrent && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-semibold text-white truncate">{paint.name}</div>
                          <div className="text-[11px] text-amber-400 font-bold">R$ {paint.price}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Concessionária List */}
          {category === 'concessionaria' && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Veículos Disponíveis para Compra
              </div>
              {CAR_MODELS.map((model) => {
                const isOwned = carModel === model.id;
                return (
                  <div
                    key={model.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isOwned
                        ? 'bg-slate-950/90 border-blue-500'
                        : 'bg-slate-950/70 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <Car className="w-4 h-4 text-blue-400" />
                          {model.name}
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            {model.speedBonus}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">{model.desc}</div>
                      </div>
                      <div className="text-right shrink-0 pl-3">
                        <div className="text-sm font-bold text-amber-400 tabular-nums">
                          R$ {model.price.toLocaleString('pt-BR')}
                        </div>
                        <button
                          disabled={isOwned}
                          onClick={() => handleDealershipBuy(model)}
                          className={`mt-2 px-3 py-1.5 font-bold text-xs rounded-xl transition-all ${
                            isOwned
                              ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 active:scale-95 text-white shadow-md shadow-blue-600/20 cursor-pointer'
                          }`}
                        >
                          {isOwned ? 'Na Garagem' : 'Comprar Carro'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Roupas List */}
          {category === 'roupas' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Cor da Camiseta
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {CLOTHING_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => setSelectedTopColor(c.hex)}
                      className={`h-9 rounded-xl border-2 transition-all ${
                        selectedTopColor === c.hex ? 'border-white scale-105' : 'border-transparent hover:opacity-80'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Cor da Calça
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {CLOTHING_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => setSelectedBottomColor(c.hex)}
                      className={`h-9 rounded-xl border-2 transition-all ${
                        selectedBottomColor === c.hex ? 'border-white scale-105' : 'border-transparent hover:opacity-80'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleApplyClothes}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  APLICAR NOVO VISUAL (R$ 40,00)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Seu Saldo: <strong className="text-emerald-400 font-bold">R$ {money.toFixed(2)}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
