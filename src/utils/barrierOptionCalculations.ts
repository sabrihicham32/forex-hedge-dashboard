
// Barrier option calculations

// Function to calculate barrier option price
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
  // Extract option base type and barrier type
  const isCall = type.includes("call");
  const isPut = type.includes("put");
  const isKO = type.includes("KO");
  const isKI = type.includes("KI");
  const isReverse = type.includes("R");
  const isDouble = type.includes("D");
  
  // Calculate delta (sensitivity to underlying price)
  let delta = 0;
  if (isCall) {
    delta = spot > strike ? 0.5 + 0.5 * (spot - strike) / (spot * vol * Math.sqrt(maturity)) : 0.5;
  } else {
    delta = spot < strike ? -0.5 - 0.5 * (strike - spot) / (spot * vol * Math.sqrt(maturity)) : -0.5;
  }
  
  // Calculate vanilla option price
  const vanillaPrice = isCall 
    ? calculateCallPrice(spot, strike, maturity, r1, r2, vol)
    : calculatePutPrice(spot, strike, maturity, r1, r2, vol);
  
  // Adjust price based on barrier type
  let barrierFactor = 1.0;
  
  if (isKO || isKI) {
    // Calculate barrier factor based on barrier type and position
    if (isDouble && upperBarrier && lowerBarrier) {
      // Double barrier (both upper and lower)
      const inBarrierRange = spot >= lowerBarrier && spot <= upperBarrier;
      barrierFactor = isKO 
        ? (isReverse ? (inBarrierRange ? 0.5 : 1.0) : (inBarrierRange ? 1.0 : 0.5)) 
        : (isReverse ? (inBarrierRange ? 0.5 : 1.0) : (inBarrierRange ? 1.0 : 0.5));
    } else if (upperBarrier) {
      // Upper barrier only
      const aboveBarrier = spot > upperBarrier;
      const barrierActive = isCall ? aboveBarrier : !aboveBarrier;
      barrierFactor = isKO 
        ? (isReverse ? (barrierActive ? 1.0 : 0.5) : (barrierActive ? 0.5 : 1.0))
        : (isReverse ? (barrierActive ? 0.5 : 1.0) : (barrierActive ? 1.0 : 0.5));
    } else if (lowerBarrier) {
      // Lower barrier only
      const belowBarrier = spot < lowerBarrier;
      const barrierActive = isCall ? !belowBarrier : belowBarrier;
      barrierFactor = isKO 
        ? (isReverse ? (barrierActive ? 1.0 : 0.5) : (barrierActive ? 0.5 : 1.0))
        : (isReverse ? (barrierActive ? 0.5 : 1.0) : (barrierActive ? 1.0 : 0.5));
    }
  }
  
  // Adjust for quantity (in percentage)
  const adjustedPrice = vanillaPrice * barrierFactor * (quantity / 100);
  
  return adjustedPrice;
};

// Helper function for barrier activation check (single barrier)
const isBarrierSingleActive = (spot: number, barrier: number, isCall: boolean, isReverse: boolean) => {
  if (isCall) {
    return isReverse 
      ? spot < barrier ? 1.0 : 0.0  // Reverse: active if spot < barrier
      : spot > barrier ? 1.0 : 0.0;  // Normal: active if spot > barrier
  } else {
    return isReverse 
      ? spot > barrier ? 1.0 : 0.0  // Reverse: active if spot > barrier
      : spot < barrier ? 1.0 : 0.0;  // Normal: active if spot < barrier
  }
};

// Helper function for barrier activation check (double barrier)
const isBarrierActive = (spot: number, upperBarrier: number, lowerBarrier: number, isReverse: boolean) => {
  if (isReverse) {
    // Reverse: active if outside the barriers
    return (spot < lowerBarrier || spot > upperBarrier) ? 1.0 : 0.0;
  } else {
    // Normal: active if between the barriers
    return (spot >= lowerBarrier && spot <= upperBarrier) ? 1.0 : 0.0;
  }
};

// Simplified Black-Scholes call option price calculation
const calculateCallPrice = (spot: number, strike: number, maturity: number, r1: number, r2: number, vol: number) => {
  const d1 = (Math.log(spot / strike) + (r1 - r2 + vol * vol / 2) * maturity) / (vol * Math.sqrt(maturity));
  const d2 = d1 - vol * Math.sqrt(maturity);
  
  // Standard normal CDF approximation for N(d)
  const nd1 = normCDF(d1);
  const nd2 = normCDF(d2);
  
  return spot * Math.exp(-r2 * maturity) * nd1 - strike * Math.exp(-r1 * maturity) * nd2;
};

// Simplified Black-Scholes put option price calculation
const calculatePutPrice = (spot: number, strike: number, maturity: number, r1: number, r2: number, vol: number) => {
  const d1 = (Math.log(spot / strike) + (r1 - r2 + vol * vol / 2) * maturity) / (vol * Math.sqrt(maturity));
  const d2 = d1 - vol * Math.sqrt(maturity);
  
  // Standard normal CDF approximation for N(-d)
  const nd1 = normCDF(-d1);
  const nd2 = normCDF(-d2);
  
  return strike * Math.exp(-r1 * maturity) * nd2 - spot * Math.exp(-r2 * maturity) * nd1;
};

// Standard normal cumulative distribution function approximation
const normCDF = (x: number) => {
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

// Function to calculate barrier option payoff at expiration
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
  // Extract option type and barrier type
  const isCall = type.includes("call");
  const isPut = type.includes("put");
  const isKO = type.includes("KO");
  const isKI = type.includes("KI");
  const isReverse = type.includes("R");
  const isDouble = type.includes("D");
  
  // Check if barriers are active at current spot price
  let isBarrierEffect = false;
  
  if (isDouble && upperBarrier && lowerBarrier) {
    // Double barrier case
    if (isReverse) {
      isBarrierEffect = currentSpot < lowerBarrier || currentSpot > upperBarrier;
    } else {
      isBarrierEffect = currentSpot >= lowerBarrier && currentSpot <= upperBarrier;
    }
  } else if (upperBarrier) {
    // Upper barrier case
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
    // Lower barrier case
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
  
  // Calculate payoff based on option type and barrier state
  let payoff = 0;
  
  if (isKO) {
    // Knock-Out option: expires worthless if barrier is hit
    if (!isBarrierEffect) {
      // Barrier not triggered, option is active
      if (isCall) {
        payoff = Math.max(0, currentSpot - strike);
      } else {
        payoff = Math.max(0, strike - currentSpot);
      }
    } else {
      // Barrier triggered, option is knocked out
      payoff = 0;
    }
  } else if (isKI) {
    // Knock-In option: becomes active only if barrier is hit
    if (isBarrierEffect) {
      // Barrier triggered, option is activated
      if (isCall) {
        payoff = Math.max(0, currentSpot - strike);
      } else {
        payoff = Math.max(0, strike - currentSpot);
      }
    } else {
      // Barrier not triggered, option remains inactive
      payoff = 0;
    }
  } else {
    // Standard vanilla option
    if (isCall) {
      payoff = Math.max(0, currentSpot - strike);
    } else {
      payoff = Math.max(0, strike - currentSpot);
    }
  }
  
  // Adjust for premium and quantity
  return (payoff - premium) * (quantity / 100);
};

// Function to calculate payoff for a custom strategy combining multiple options
export const calculateCustomStrategyPayoff = (
  options: any[], 
  spotPrice: number, 
  initialSpot: number,
  globalParams: any
) => {
  let totalPayoff = 0;
  
  options.forEach((option) => {
    if (!option.actualStrike) return; // Skip if strike is undefined
    
    let optionPayoff = 0;
    
    // Calculate payoff based on option type
    if (option.type.includes("KI") || option.type.includes("KO")) {
      // Barrier option payoff
      optionPayoff = calculateBarrierOptionPayoff(
        option.type,
        spotPrice,
        initialSpot,
        option.actualStrike,
        option.actualUpperBarrier,
        option.actualLowerBarrier,
        option.premium || 0,
        option.quantity
      );
    } else if (option.type === "call") {
      // Vanilla call option payoff
      const intrinsicValue = Math.max(0, spotPrice - option.actualStrike);
      optionPayoff = (intrinsicValue - (option.premium || 0)) * (option.quantity / 100);
    } else if (option.type === "put") {
      // Vanilla put option payoff
      const intrinsicValue = Math.max(0, option.actualStrike - spotPrice);
      optionPayoff = (intrinsicValue - (option.premium || 0)) * (option.quantity / 100);
    }
    
    totalPayoff += optionPayoff;
  });
  
  return totalPayoff;
};

// Function to calculate option premium
export const calculateOptionPremium = (option: any, spot: number, globalParams: any) => {
  const { type, strikeType, strike, volatility, upperBarrier, lowerBarrier, upperBarrierType, lowerBarrierType } = option;
  
  // Calculate actual strike from percentage or absolute value
  const actualStrike = strikeType === "percentage" 
    ? spot * (strike / 100) 
    : strike;
    
  // Calculate actual barriers if defined
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
  
  // Calculate premium based on option type
  if (type.includes("KI") || type.includes("KO")) {
    // Barrier option premium
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
    // Vanilla call option premium
    return calculateCallPrice(
      spot,
      actualStrike,
      globalParams.maturity,
      globalParams.r1,
      globalParams.r2,
      volatility / 100
    ) * (option.quantity / 100);
  } else if (type === "put") {
    // Vanilla put option premium
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

// New function to calculate best and worst case scenarios for risk/reward analysis
export const calculateRiskReward = (options: any[], initialSpot: number, globalParams: any) => {
  // Define range for spot price simulation (e.g., -30% to +30% of initial spot)
  const minSpot = initialSpot * 0.7;
  const maxSpot = initialSpot * 1.3;
  const numSteps = 100;
  const step = (maxSpot - minSpot) / numSteps;
  
  let bestCase = -Infinity;
  let worstCase = Infinity;
  let bestCaseSpot = initialSpot;
  let worstCaseSpot = initialSpot;
  
  // Simulate strategy payoff across a range of spot prices
  for (let spot = minSpot; spot <= maxSpot; spot += step) {
    const payoff = calculateCustomStrategyPayoff(options, spot, initialSpot, globalParams);
    
    // Update best case
    if (payoff > bestCase) {
      bestCase = payoff;
      bestCaseSpot = spot;
    }
    
    // Update worst case
    if (payoff < worstCase) {
      worstCase = payoff;
      worstCaseSpot = spot;
    }
  }
  
  // Calculate risk/reward ratio (absolute value of best case / worst case)
  const riskRewardRatio = worstCase !== 0 ? Math.abs(bestCase / worstCase) : Infinity;
  
  return {
    bestCase,
    worstCase,
    bestCaseSpot,
    worstCaseSpot,
    riskRewardRatio
  };
};
