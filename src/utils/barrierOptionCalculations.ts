
// Calculs pour les options avec barrière

// Fonction pour calculer le prix d'une option avec barrière
export const calculateBarrierOptionPrice = (
  type: string,
  spot: number,
  strike: number,
  upperBarrier: number | undefined,
  lowerBarrier: number | undefined,
  maturity: number,
  r1: number,
  r2: number,
  vol: number,
  quantity: number = 1
) => {
  // Note: Cette implémentation est une approximation simplifiée
  // Dans un environnement de production, il faudrait utiliser des modèles plus sophistiqués
  
  // Extraire le type d'option de base et le type de barrière
  const isCall = type.includes("call");
  const isPut = type.includes("put");
  const isKO = type.includes("KO");
  const isKI = type.includes("KI");
  const isReverse = type.includes("R");
  const isDouble = type.includes("D");
  
  // Calculer le delta (sensibilité au prix du sous-jacent)
  let delta = 0;
  if (isCall) {
    delta = spot > strike ? 0.5 + 0.5 * (spot - strike) / (spot * vol * Math.sqrt(maturity)) : 0.5;
  } else {
    delta = spot < strike ? -0.5 - 0.5 * (strike - spot) / (spot * vol * Math.sqrt(maturity)) : -0.5;
  }
  
  // Calculer le prix de l'option vanille
  const vanillaPrice = isCall 
    ? calculateCallPrice(spot, strike, maturity, r1, r2, vol)
    : calculatePutPrice(spot, strike, maturity, r1, r2, vol);
  
  // Ajuster le prix en fonction du type de barrière
  let barrierFactor = 1.0;
  
  if (isKO || isKI) {
    const barrier = isDouble 
      ? (upperBarrier && lowerBarrier 
          ? isBarrierActive(spot, upperBarrier, lowerBarrier, isReverse) 
          : 1.0)
      : (upperBarrier 
          ? isBarrierSingleActive(spot, upperBarrier, isCall, isReverse) 
          : 1.0);
    
    barrierFactor = isKO ? (1.0 - barrier * 0.5) : barrier * 0.5;
  }
  
  // Ajuster pour la quantité (en pourcentage)
  const adjustedPrice = vanillaPrice * barrierFactor * (quantity / 100);
  
  return adjustedPrice;
};

// Fonction auxiliaire pour vérifier si une barrière simple est active
const isBarrierSingleActive = (spot: number, barrier: number, isCall: boolean, isReverse: boolean) => {
  if (isCall) {
    return isReverse 
      ? spot < barrier ? 1.0 : 0.0  // Reverse: active si spot < barrière
      : spot > barrier ? 1.0 : 0.0;  // Normal: active si spot > barrière
  } else {
    return isReverse 
      ? spot > barrier ? 1.0 : 0.0  // Reverse: active si spot > barrière
      : spot < barrier ? 1.0 : 0.0;  // Normal: active si spot < barrière
  }
};

// Fonction auxiliaire pour vérifier si une double barrière est active
const isBarrierActive = (spot: number, upperBarrier: number, lowerBarrier: number, isReverse: boolean) => {
  if (isReverse) {
    // Reverse: active si en dehors des barrières
    return (spot < lowerBarrier || spot > upperBarrier) ? 1.0 : 0.0;
  } else {
    // Normal: active si entre les barrières
    return (spot >= lowerBarrier && spot <= upperBarrier) ? 1.0 : 0.0;
  }
};

// Calcul simplifié du prix d'une option call
const calculateCallPrice = (spot: number, strike: number, maturity: number, r1: number, r2: number, vol: number) => {
  // Formule simplifiée de Black-Scholes pour les options call
  const d1 = (Math.log(spot / strike) + (r1 - r2 + vol * vol / 2) * maturity) / (vol * Math.sqrt(maturity));
  const d2 = d1 - vol * Math.sqrt(maturity);
  
  // Approximation normale standard de N(d)
  const nd1 = normCDF(d1);
  const nd2 = normCDF(d2);
  
  return spot * Math.exp(-r2 * maturity) * nd1 - strike * Math.exp(-r1 * maturity) * nd2;
};

// Calcul simplifié du prix d'une option put
const calculatePutPrice = (spot: number, strike: number, maturity: number, r1: number, r2: number, vol: number) => {
  // Formule simplifiée de Black-Scholes pour les options put
  const d1 = (Math.log(spot / strike) + (r1 - r2 + vol * vol / 2) * maturity) / (vol * Math.sqrt(maturity));
  const d2 = d1 - vol * Math.sqrt(maturity);
  
  // Approximation normale standard de N(-d)
  const nd1 = normCDF(-d1);
  const nd2 = normCDF(-d2);
  
  return strike * Math.exp(-r1 * maturity) * nd2 - spot * Math.exp(-r2 * maturity) * nd1;
};

// Approximation de la fonction de répartition normale cumulée
const normCDF = (x: number) => {
  // Approximation de N(x)
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);
  
  return 0.5 * (1.0 + sign * y);
};

// Fonction pour calculer le payoff d'une option avec barrière à un spot donné
export const calculateBarrierOptionPayoff = (
  type: string,
  currentSpot: number,
  initialSpot: number,
  strike: number, 
  upperBarrier: number | undefined, 
  lowerBarrier: number | undefined,
  premium: number,
  quantity: number = 100
) => {
  // Extraire le type d'option et le type de barrière
  const isCall = type.includes("call");
  const isPut = type.includes("put");
  const isKO = type.includes("KO");
  const isKI = type.includes("KI");
  const isReverse = type.includes("R");
  const isDouble = type.includes("D");
  
  // Vérifier si les barrières sont actives au spot actuel
  let isBarrierEffect = false;
  
  if (isDouble && upperBarrier && lowerBarrier) {
    // Double barrière
    if (isReverse) {
      isBarrierEffect = currentSpot < lowerBarrier || currentSpot > upperBarrier;
    } else {
      isBarrierEffect = currentSpot >= lowerBarrier && currentSpot <= upperBarrier;
    }
  } else if (upperBarrier) {
    // Barrière simple
    if (isCall) {
      if (isReverse) {
        isBarrierEffect = currentSpot < upperBarrier;
      } else {
        isBarrierEffect = currentSpot > upperBarrier;
      }
    } else { // Put
      if (isReverse) {
        isBarrierEffect = currentSpot > upperBarrier;
      } else {
        isBarrierEffect = currentSpot < upperBarrier;
      }
    }
  } else if (lowerBarrier) {
    // Barrière simple basse (ajout de ce cas)
    if (isCall) {
      if (isReverse) {
        isBarrierEffect = currentSpot > lowerBarrier;
      } else {
        isBarrierEffect = currentSpot < lowerBarrier;
      }
    } else { // Put
      if (isReverse) {
        isBarrierEffect = currentSpot < lowerBarrier;
      } else {
        isBarrierEffect = currentSpot > lowerBarrier;
      }
    }
  }
  
  // Calculer le payoff en fonction du type d'option et de l'état de la barrière
  let payoff = 0;
  
  if (isKO) {
    // Option Knock-Out
    if (!isBarrierEffect) {
      // La barrière n'a pas été touchée, l'option est active
      if (isCall) {
        payoff = Math.max(0, currentSpot - strike);
      } else {
        payoff = Math.max(0, strike - currentSpot);
      }
    } else {
      // La barrière a été touchée, l'option est désactivée
      payoff = 0;
    }
  } else if (isKI) {
    // Option Knock-In
    if (isBarrierEffect) {
      // La barrière a été touchée, l'option est activée
      if (isCall) {
        payoff = Math.max(0, currentSpot - strike);
      } else {
        payoff = Math.max(0, strike - currentSpot);
      }
    } else {
      // La barrière n'a pas été touchée, l'option reste inactive
      payoff = 0;
    }
  } else {
    // Option vanille standard (sans barrière)
    if (isCall) {
      payoff = Math.max(0, currentSpot - strike);
    } else {
      payoff = Math.max(0, strike - currentSpot);
    }
  }
  
  // Ajuster pour la prime et la quantité
  return (payoff - premium) * (quantity / 100);
};

// Function to calculate custom strategy payoff
export const calculateCustomStrategyPayoff = (
  options: any[], 
  spotPrice: number, 
  initialSpot: number,
  globalParams: any
) => {
  let totalPayoff = 0;
  
  options.forEach((option) => {
    const quantity = option.quantity / 100; // Convert percentage to decimal
    const strike = option.actualStrike;
    
    if (!strike) return; // Skip if no strike price defined
    
    let optionPayoff = 0;
    
    // Vérifier si c'est une option avec barrière
    if (option.type.includes("KI") || option.type.includes("KO")) {
      // Calculer le payoff pour les options avec barrière
      optionPayoff = calculateBarrierOptionPayoff(
        option.type,
        spotPrice,
        initialSpot,
        strike,
        option.actualUpperBarrier,
        option.actualLowerBarrier,
        option.premium || 0,
        option.quantity
      );
    } else {
      // Calculer le payoff pour les options vanille
      if (option.type === "call") {
        if (spotPrice > strike) {
          optionPayoff = (strike - spotPrice) * quantity; // Perte pour l'acheteur = gain pour le vendeur
        }
      } else if (option.type === "put") {
        if (spotPrice < strike) {
          optionPayoff = (strike - spotPrice) * quantity;
        }
      }
      
      // Soustraire la prime payée (si définie)
      if (option.premium) {
        optionPayoff -= option.premium * quantity;
      }
    }
    
    totalPayoff += optionPayoff;
  });
  
  return totalPayoff;
};

// Ajouter cette fonction pour calculer correctement la prime des options avec barrière
export const calculateOptionPremium = (option: any, spot: number, globalParams: any) => {
  const { type, strikeType, strike, volatility, upperBarrier, lowerBarrier, upperBarrierType, lowerBarrierType } = option;
  
  // Calculer le strike réel
  const actualStrike = strikeType === "percentage" 
    ? spot * (strike / 100) 
    : strike;
    
  // Calculer les barrières réelles si elles existent
  const actualUpperBarrier = upperBarrier 
    ? (upperBarrierType === "percentage" 
        ? spot * (upperBarrier / 100) 
        : upperBarrier)
    : undefined;
    
  const actualLowerBarrier = lowerBarrier 
    ? (lowerBarrierType === "percentage" 
        ? spot * (lowerBarrier / 100) 
        : lowerBarrier)
    : undefined;
  
  // Déterminer le type d'option (avec ou sans barrière)
  if (type.includes("KI") || type.includes("KO")) {
    // Option avec barrière
    return calculateBarrierOptionPrice(
      type,
      spot,
      actualStrike,
      actualUpperBarrier,
      actualLowerBarrier,
      globalParams.maturity,
      globalParams.r1,
      globalParams.r2,
      volatility / 100,
      option.quantity
    );
  } else if (type === "call") {
    // Option call vanille
    return calculateCallPrice(
      spot,
      actualStrike,
      globalParams.maturity,
      globalParams.r1,
      globalParams.r2,
      volatility / 100
    ) * (option.quantity / 100);
  } else if (type === "put") {
    // Option put vanille
    return calculatePutPrice(
      spot,
      actualStrike,
      globalParams.maturity,
      globalParams.r1,
      globalParams.r2,
      volatility / 100
    ) * (option.quantity / 100);
  }
  
  return 0;
};
