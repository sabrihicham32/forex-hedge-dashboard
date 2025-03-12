
import { erf } from 'mathjs';
import { OptionComponent } from '@/components/CustomStrategyOption';

/**
 * Calcule le prix d'une option selon Black-Scholes
 * @param S - Prix spot
 * @param K - Strike
 * @param T - Maturité
 * @param r1 - Taux sans risque devise 1
 * @param r2 - Taux sans risque devise 2
 * @param sigma - Volatilité
 */
const calculateBlackScholes = (S: number, K: number, T: number, r1: number, r2: number, sigma: number, type: 'call' | 'put') => {
  const d1 = (Math.log(S/K) + (r1 - r2 + Math.pow(sigma, 2)/2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  
  if (type === 'call') {
    const nd1 = (1 + erf(d1/Math.sqrt(2)))/2;
    const nd2 = (1 + erf(d2/Math.sqrt(2)))/2;
    return S * Math.exp(-r2*T) * nd1 - K * Math.exp(-r1*T) * nd2;
  } else {
    const nd1 = (1 + erf(-d1/Math.sqrt(2)))/2;
    const nd2 = (1 + erf(-d2/Math.sqrt(2)))/2;
    return K * Math.exp(-r1*T) * nd2 - S * Math.exp(-r2*T) * nd1;
  }
};

/**
 * Calcule le facteur d'ajustement pour les options à barrière
 */
const calculateBarrierAdjustment = (option: OptionComponent, spotPrice: number, timeToMaturity: number) => {
  const hasUpperBarrier = option.upperBarrier !== undefined;
  const hasLowerBarrier = option.lowerBarrier !== undefined;
  const sigma = option.volatility / 100;
  
  let adjustment = 1.0;
  
  if (hasUpperBarrier || hasLowerBarrier) {
    const upperB = option.actualUpperBarrier;
    const lowerB = option.actualLowerBarrier;
    
    // Calcul de la distance normalisée à la barrière
    const timeScaling = Math.sqrt(timeToMaturity);
    
    if (hasUpperBarrier && !hasLowerBarrier) {
      const distanceToBarrier = Math.abs((upperB! - spotPrice) / spotPrice);
      adjustment = option.type.includes('KO') 
        ? Math.max(0.1, Math.min(0.9, distanceToBarrier / (sigma * timeScaling)))
        : Math.max(0.1, Math.min(0.9, 1 - distanceToBarrier / (sigma * timeScaling)));
    }
    else if (hasLowerBarrier && !hasUpperBarrier) {
      const distanceToBarrier = Math.abs((spotPrice - lowerB!) / spotPrice);
      adjustment = option.type.includes('KO')
        ? Math.max(0.1, Math.min(0.9, distanceToBarrier / (sigma * timeScaling)))
        : Math.max(0.1, Math.min(0.9, 1 - distanceToBarrier / (sigma * timeScaling)));
    }
    else if (hasUpperBarrier && hasLowerBarrier) {
      // Pour les doubles barrières, on considère la distance à la barrière la plus proche
      const upperDistance = Math.abs((upperB! - spotPrice) / spotPrice);
      const lowerDistance = Math.abs((spotPrice - lowerB!) / spotPrice);
      const minDistance = Math.min(upperDistance, lowerDistance);
      
      // Le prix diminue quand le spot s'approche d'une des barrières
      adjustment = Math.max(0.1, Math.min(0.9, minDistance / (sigma * timeScaling)));
    }
  }
  
  return adjustment;
};

/**
 * Calcule la prime d'une option avec prise en compte des barrières et spreads
 */
export const calculateCustomOptionPremium = (option: OptionComponent, spot: number, params: any) => {
  const { maturity, r1, r2 } = params;
  const sigma = option.volatility / 100;
  
  // Calcul du prix Black-Scholes standard
  let premium = calculateBlackScholes(
    spot,
    option.actualStrike || spot,
    maturity,
    r1,
    r2,
    sigma,
    option.type.includes('put') ? 'put' : 'call'
  );
  
  // Ajustement pour les barrières si présentes
  const barrierAdjustment = calculateBarrierAdjustment(option, spot, maturity);
  premium *= barrierAdjustment;
  
  // Application des spreads bid/ask
  if (option.quantity > 0 && option.bidSpread) { // Achat - spread bid
    premium *= (1 + option.bidSpread / 100);
  } else if (option.quantity < 0 && option.askSpread) { // Vente - spread ask
    premium *= (1 - option.askSpread / 100);
  }
  
  // Ajustement pour la quantité (en pourcentage)
  return premium * (Math.abs(option.quantity) / 100);
};

/**
 * Calcule le payoff d'une option à un spot donné
 */
export const calculateCustomPayoff = (option: OptionComponent, spotAtExpiry: number, includePremium: boolean = true) => {
  if (!option.actualStrike) return 0;
  
  // Vérification de l'activation des barrières
  let isActive = true;
  
  if (option.actualUpperBarrier) {
    if (option.type.includes('KO')) {
      isActive = spotAtExpiry < option.actualUpperBarrier;
    } else if (option.type.includes('KI')) {
      isActive = spotAtExpiry >= option.actualUpperBarrier;
    }
  }
  
  if (option.actualLowerBarrier) {
    if (option.type.includes('KO')) {
      isActive = isActive && spotAtExpiry > option.actualLowerBarrier;
    } else if (option.type.includes('KI')) {
      isActive = isActive && spotAtExpiry <= option.actualLowerBarrier;
    }
  }
  
  if (!isActive) {
    return includePremium ? -1 * (option.premium || 0) : 0;
  }
  
  // Calcul du payoff intrinsèque
  let intrinsicValue = 0;
  if (option.type.includes('call')) {
    intrinsicValue = Math.max(0, spotAtExpiry - option.actualStrike);
  } else {
    intrinsicValue = Math.max(0, option.actualStrike - spotAtExpiry);
  }
  
  // Application de la quantité (positive pour long, négative pour short)
  const quantityFactor = option.quantity > 0 ? 1 : -1;
  const quantityAdjusted = intrinsicValue * Math.abs(option.quantity) / 100 * quantityFactor;
  
  return includePremium ? quantityAdjusted - (option.premium || 0) : quantityAdjusted;
};

/**
 * Calcule les données du payoff pour une stratégie personnalisée
 */
export const generateCustomPayoffData = (options: OptionComponent[], spot: number, includePremium: boolean) => {
  const minSpot = spot * 0.7;
  const maxSpot = spot * 1.3;
  const numSteps = 100;
  const step = (maxSpot - minSpot) / numSteps;
  
  const payoffData = [];
  
  for (let currentSpot = minSpot; currentSpot <= maxSpot; currentSpot += step) {
    const dataPoint: any = {
      spot: parseFloat(currentSpot.toFixed(4)),
      'Unhedged Rate': parseFloat(currentSpot.toFixed(4)),
      'Initial Spot': parseFloat(spot.toFixed(4))
    };
    
    // Calcul du payoff total pour toutes les options
    const totalPayoff = options.reduce((sum, option) => {
      return sum + calculateCustomPayoff(option, currentSpot, includePremium);
    }, 0);
    
    dataPoint['Hedged Rate'] = parseFloat((currentSpot + totalPayoff).toFixed(4));
    
    // Ajout des lignes de référence pour le premier point seulement
    if (payoffData.length === 0) {
      options.forEach((option, index) => {
        if (option.actualStrike) {
          dataPoint[`Option ${index + 1} Strike`] = parseFloat(option.actualStrike.toFixed(4));
        }
        if (option.actualUpperBarrier) {
          dataPoint[`Option ${index + 1} Upper Barrier`] = parseFloat(option.actualUpperBarrier.toFixed(4));
        }
        if (option.actualLowerBarrier) {
          dataPoint[`Option ${index + 1} Lower Barrier`] = parseFloat(option.actualLowerBarrier.toFixed(4));
        }
      });
    }
    
    payoffData.push(dataPoint);
  }
  
  return payoffData;
};

