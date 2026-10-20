import React, { useState } from 'react';
import { StoreCategory, StoreItem, CharacterConfig } from '../types';
import { X, ShoppingBag, Coffee, Wrench, Sparkles, Check, Car, Apple, Zap } from 'lucide-react';
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
  { id: 'pao_de_queijo', name: 'Pão de Queijo Mineiro', price: 8, description: 'Quentinho e macio, queijo canastra legítimo.', category: 'padaria', effectType: 'energy', effectValue: 25 },
  { id: 'coxinha', name: 'Coxinha com Catupiry', price: 10, description: 'Crocante por fora e cremosa por dentro.', category: 'padaria', effectType: 'energy', effectValue: 35 },
  { id: 'cafe_pingado', name: 'Café Pingado no Copo', price: 4, description: 'Café forte brasileiro com toque de leite quente.', category: 'padaria', effectType: 'energy', effectValue: 15 },
  { id: 'guarana', name: 'Guaraná Gelado (Lata)', price: 6, description: 'Bebida de guaraná da Amazônia.', category: 'padaria', effectType: 'energy', effectValue: 20 },
];

const MERCADO_ITEMS: StoreItem[] = [
  { id: 'agua_mineral', name: 'Água Mineral da Serra (500ml)', price: 4, description: 'Puríssima e gelada, mata a sede e reidrata.', category: 'mercado', effectType: 'energy', effectValue: 18 },
  { id: 'maca', name: 'Maçã Vermelha Fresca', price: 3, description: 'Fruta fresca colhida no interior.', category: 'mercado', effectType: 'energy', effectValue: 12 },
  { id: 'barra_cereal', name: 'Barra de Cereal com Castanhas', price: 6, description: 'Energia rápida e prática para entregadores.', category: 'mercado', effectType: 'energy', effectValue: 25 },
  { id: 'sanduiche', name: 'Sanduíche Natural de Frango', price: 14, description: 'Pão integral com peito de frango desfiado.', category: 'mercado', effectType: 'energy', effectValue: 45 },
  { id: 'energetico', name: 'Energético Nitro Bull (Lata)', price: 12, description: 'Dose potente de cafeína e taurina.', category: 'mercado', effectType: 'energy', effectValue: 55 },
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
        return { name: 'Padaria Pão Dourado', desc: 'Salgados, café e lanches tradicionais para recarregar sua energia' };
      case 'mercado':
        return { name: 'Mercadinho Vila Nova', desc: 'Bebidas geladas, energéticos e alimentos rápidos' };
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
      setPurchasedMessage(`Você comprou ${item.name}! (+${item.effectValue}% Energia)`);
      setTimeout(() => setPurchasedMessage(null), 2500);
    } else {
      setPurchasedMessage('Saldo insuficiente! Faça entregas na Flash Express.');
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
    if (carModel === model.id) {
      setPurchasedMessage(`Você já possui este modelo (${model.name})!`);
      setTimeout(() => setPurchasedMessage(null), 2500);
      return;
    }
    if (money < model.price) {
      setPurchasedMessage(`Saldo insuficiente! Custa R$ ${model.price}`);
      setTimeout(() => setPurchasedMessage(null), 2500);
      return;
    }
    const success = onBuyItem({
      id: `car_model_${model.id}`,
      name: model.name,
      price: model.price,
      description: model.desc,
      category: 'concessionaria',
      effectType: 'buy_car',
      effectValue: model.id,
    });
    if (success) {
      onBuyCar?.(model.id, model.price);
      soundManager.playCashSound();
      setPurchasedMessage(`Parabéns! Você adquiriu o ${model.name}!`);
      setTimeout(() => setPurchasedMessage(null), 2500);
    }
  };

  const handleApplyClothes = () => {
    const cost = 40;
    if (money < cost) {
      setPurchasedMessage(`Saldo insuficiente! Custa R$ ${cost}`);
      setTimeout(() => setPurchasedMessage(null), 2500);
      return;
    }
    const success = onBuyItem({
      id: 'custom_clothes',
      name: 'Novo Visual de Roupas',
      price: cost,
      description: 'Camiseta e calça novas',
      category: 'roupas',
    });
    if (success) {
      onUpdateCharacterClothes({
        topColor: selectedTopColor,
        bottomColor: selectedBottomColor,
      });
      soundManager.playCashSound();
      setPurchasedMessage('Novo visual aplicado com sucesso!');
      setTimeout(() => setPurchasedMessage(null), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              {category === 'padaria' && <Coffee className="w-5 h-5" />}
              {category === 'mercado' && <Apple className="w-5 h-5 text-emerald-400" />}
              {category === 'oficina' && <Wrench className="w-5 h-5 text-blue-400" />}
              {category === 'concessionaria' && <Car className="w-5 h-5 text-sky-400" />}
              {category === 'roupas' && <ShoppingBag className="w-5 h-5 text-purple-400" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{storeInfo.name}</h2>
              <p className="text-xs text-slate-400">{storeInfo.desc}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback message banner */}
        {purchasedMessage && (
          <div className="bg-amber-500/20 border-b border-amber-500/30 px-6 py-2 text-xs font-semibold text-amber-300 text-center animate-in fade-in">
            {purchasedMessage}
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {category === 'padaria' && (
            <div className="space-y-3">
              {PADARIA_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl hover:border-slate-700 transition-all"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-white text-sm">{item.name}</div>
                    <div className="text-xs text-slate-400">{item.description}</div>
                    <div className="text-[11px] text-emerald-400 font-medium">
                      +{item.effectValue}% Energia
                    </div>
                  </div>
                  <button
                    onClick={() => handleBuyConsumable(item)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-amber-500/10 shrink-0 cursor-pointer"
                  >
                    R$ {item.price.toFixed(2)}
                  </button>
                </div>
              ))}
            </div>
          )}

          {category === 'mercado' && (
            <div className="space-y-3">
              {MERCADO_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl hover:border-slate-700 transition-all"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-white text-sm">{item.name}</div>
                    <div className="text-xs text-slate-400">{item.description}</div>
                    <div className="text-[11px] text-emerald-400 font-medium">
                      +{item.effectValue}% Energia
                    </div>
                  </div>
                  <button
                    onClick={() => handleBuyConsumable(item)}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-emerald-500/10 shrink-0 cursor-pointer"
                  >
                    R$ {item.price.toFixed(2)}
                  </button>
                </div>
              ))}
            </div>
          )}

          {category === 'oficina' && (
            <div className="space-y-4">
              {/* Kit Tuning */}
              <div className="p-3.5 bg-blue-950/40 border border-blue-500/30 rounded-xl flex items-center justify-between">
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
                  className={`px-4 py-2 font-bold text-xs rounded-lg transition-all ${
                    hasCarTuning
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-md shadow-blue-500/20 cursor-pointer'
                  }`}
                >
                  {hasCarTuning ? 'Instalado' : 'Instalar'}
                </button>
              </div>

              {/* Pinturas */}
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
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                          isCurrent
                            ? 'bg-slate-800/80 border-amber-500 shadow-md'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className="w-7 h-7 rounded-lg border border-white/20 shrink-0 shadow-inner flex items-center justify-center"
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
                    className={`p-3.5 rounded-xl border transition-all ${
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
                          className={`mt-2 px-3 py-1.5 font-bold text-xs rounded-lg transition-all ${
                            isOwned
                              ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:scale-95 text-white shadow-md shadow-blue-600/20 cursor-pointer'
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
                      className={`h-9 rounded-lg border-2 transition-all ${
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
                      className={`h-9 rounded-lg border-2 transition-all ${
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
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
