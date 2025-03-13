import { erf } from 'mathjs';

export interface OptionComponent {
  type: string;
  strike: number;
  strikeType: "absolute" | "percentage";
  volatility: number;
  quantity: number;
  premium?: number;
  upperBarrier?: number;
  upperBarrierType?: "absolute" | "percentage";
  lowerBarrier?: number;
  lowerBarrierType?: "absolute" | "percentage";
  actualStrike?: number;
  actualUpperBarrier?: number;
  actualLowerBarrier?: number;
  bidSpread?: number;
  askSpread?: number;
}

// Calculate Black-Scholes option premium
export const calculateOptionPremium = (option: OptionComponent, spot: number, params: any) => {
  const { maturity, r1, r2 } = params;
  const sigma = option.volatility / 100; // Convert from percentage
  
  const actualStrike = option.strikeType === "percentage" 
    ? spot * (option.strike / 100) 
    : option.strike;
  
  // Calculate standard Black-Scholes premium
  let premium = 0;
  
  if (option.type === "call") {
    premium = calculateCallPremium(spot, actualStrike, maturity, r1, r2, sigma);
  } else if (option.type === "put") {
    premium = calculatePutPremium(spot, actualStrike, maturity, r1, r2, sigma);
  }
  
  // Apply barrier adjustments if present
  if (option.upperBarrier || option.lowerBarrier) {
    premium = adjustPremiumForBarriers(option, spot, premium, maturity, sigma);
  }
  
  // Apply bid/ask spread if present
  if (option.quantity > 0 && option.bidSpread) { // Buying - apply bid spread
    premium *= (1 + option.bidSpread / 100);
  } else if (option.quantity < 0 && option.askSpread) { // Selling - apply ask spread
    premium *= (1 - option.askSpread / 100);
  }
  
  // Apply quantity (as percentage)
  return premium * (Math.abs(option.quantity) / 100);
};

// Improved call option premium calculation using Black-Scholes
const calculateCallPremium = (S: number, K: number, T: number, r1: number, r2: number, sigma: number) => {
  const d1 = (Math.log(S/K) + (r1 - r2 + 0.5 * Math.pow(sigma, 2)) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  
  const nd1 = (1 + erf(d1/Math.sqrt(2)))/2;
  const nd2 = (1 + erf(d2/Math.sqrt(2)))/2;
  
  return S * Math.exp(-r2 * T) * nd1 - K * Math.exp(-r1 * T) * nd2;
};

// Calculate put option premium using Black-Scholes
const calculatePutPremium = (S: number, K: number, T: number, r1: number, r2: number, sigma: number) => {
  const d1 = (Math.log(S/K) + (r1 - r2 + 0.5 * Math.pow(sigma, 2)) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  
  const nd1 = (1 + erf(-d1/Math.sqrt(2)))/2;
  const nd2 = (1 + erf(-d2/Math.sqrt(2)))/2;
  
  return K * Math.exp(-r1 * T) * nd2 - S * Math.exp(-r2 * T) * nd1;
};

// Improved barrier option adjustment
const adjustPremiumForBarriers = (option: OptionComponent, spot: number, premium: number, maturity: number, sigma: number) => {
  // Get actual barrier values
  const actualUpperBarrier = option.upperBarrier 
    ? (option.upperBarrierType === "percentage" ? spot * (option.upperBarrier / 100) : option.upperBarrier)
    : undefined;
    
  const actualLowerBarrier = option.lowerBarrier 
    ? (option.lowerBarrierType === "percentage" ? spot * (option.lowerBarrier / 100) : option.lowerBarrier)
    : undefined;
  
  const actualStrike = option.strikeType === "percentage" 
    ? spot * (option.strike / 100) 
    : option.strike;
  
  // Apply specific barrier adjustments based on option type
  let adjustmentFactor = 1.0;
  
  // For call options
  if (option.type === "call") {
    // Call with upper barrier only (knock-out)
    if (actualUpperBarrier && !actualLowerBarrier) {
      // Apply rebate factor based on barrier proximity
      const distanceToBarrier = (actualUpperBarrier - spot) / spot;
      const timeScaling = Math.sqrt(maturity);
      adjustmentFactor = Math.max(0.1, Math.min(0.9, distanceToBarrier / (sigma * timeScaling)));
    }
    // Call with lower barrier only (knock-in)
    else if (actualLowerBarrier && !actualUpperBarrier) {
      // For knock-in, premium increases as spot gets closer to barrier
      const distanceToBarrier = (spot - actualLowerBarrier) / spot;
      const timeScaling = Math.sqrt(maturity);
      adjustmentFactor = Math.max(0.1, Math.min(0.9, 1 - distanceToBarrier / (sigma * timeScaling)));
    }
  } 
  // For put options
  else if (option.type === "put") {
    // Put with upper barrier only (knock-in)
    if (actualUpperBarrier && !actualLowerBarrier) {
      // For knock-in, premium increases as spot gets closer to barrier
      const distanceToBarrier = (actualUpperBarrier - spot) / spot;
      const timeScaling = Math.sqrt(maturity);
      adjustmentFactor = Math.max(0.1, Math.min(0.9, 1 - distanceToBarrier / (sigma * timeScaling)));
    }
    // Put with lower barrier only (knock-out)
    else if (actualLowerBarrier && !actualUpperBarrier) {
      // Apply rebate factor based on barrier proximity
      const distanceToBarrier = (spot - actualLowerBarrier) / spot;
      const timeScaling = Math.sqrt(maturity);
      adjustmentFactor = Math.max(0.1, Math.min(0.9, distanceToBarrier / (sigma * timeScaling)));
    }
  }
  
  // For double barriers
  if (actualUpperBarrier && actualLowerBarrier) {
    // Premium is reduced for narrow corridors
    const corridorWidth = (actualUpperBarrier - actualLowerBarrier) / spot;
    adjustmentFactor = Math.max(0.1, Math.min(0.9, corridorWidth / (2 * sigma * Math.sqrt(maturity))));
  }
  
  return premium * adjustmentFactor;
};

// Improved barrier activation check
export const isBarrierActive = (option: OptionComponent, spotPrice: number): boolean => {
  // If no barriers, option is active
  if (!option.actualUpperBarrier && !option.actualLowerBarrier) {
    return true;
  }
  
  // Handle Call options with barriers
  if (option.type === "call") {
    // Call with upper barrier (KO) - option is inactive if spot exceeds barrier
    if (option.actualUpperBarrier && !option.actualLowerBarrier) {
      return spotPrice < option.actualUpperBarrier;
    }
    // Call with lower barrier (KI) - option is active only if spot has hit barrier
    else if (option.actualLowerBarrier && !option.actualUpperBarrier) {
      return spotPrice >= option.actualLowerBarrier;
    }
  } 
  // Handle Put options with barriers
  else if (option.type === "put") {
    // Put with upper barrier (KI) - option is active only if spot has hit barrier
    if (option.actualUpperBarrier && !option.actualLowerBarrier) {
      return spotPrice >= option.actualUpperBarrier;
    }
    // Put with lower barrier (KO) - option is inactive if spot is below barrier
    else if (option.actualLowerBarrier && !option.actualUpperBarrier) {
      return spotPrice > option.actualLowerBarrier;
    }
  }
  
  // For double barriers (both upper and lower)
  if (option.actualUpperBarrier && option.actualLowerBarrier) {
    return spotPrice >= option.actualLowerBarrier && spotPrice <= option.actualUpperBarrier;
  }
  
  return true;
};

// Improved payoff calculation for a single option at a specific spot price
export const calculateOptionPayoff = (option: OptionComponent, spotAtExpiry: number, includePremium: boolean = true): number => {
  if (!option.actualStrike) {
    return 0;
  }
  
  // Check if the option is active based on its barriers
  const active = isBarrierActive(option, spotAtExpiry);
  
  if (!active) {
    return includePremium ? -1 * (option.premium || 0) : 0;
  }
  
  // Calculate intrinsic value based on option type with fixed call calculation
  let intrinsicValue = 0;
  
  if (option.type === "call") {
    // Fixed call payoff calculation
    intrinsicValue = spotAtExpiry > option.actualStrike 
      ? spotAtExpiry - option.actualStrike
      : 0;
  } else if (option.type === "put") {
    intrinsicValue = option.actualStrike > spotAtExpiry
      ? option.actualStrike - spotAtExpiry
      : 0;
  }
  
  // Apply quantity adjustment (positive for long, negative for short)
  const quantityFactor = option.quantity > 0 ? 1 : -1;
  const quantityAdjusted = intrinsicValue * Math.abs(option.quantity) / 100 * quantityFactor;
  
  // Calculate total payoff
  return includePremium ? quantityAdjusted - (option.premium || 0) : quantityAdjusted;
};

// Calculate the total payoff of a custom strategy at a specific spot price
export const calculateCustomStrategyPayoff = (
  options: OptionComponent[], 
  spotAtExpiry: number, 
  initialSpot: number, 
  params: any, 
  includePremium: boolean = true
): number => {
  // Calculate the PnL in absolute terms (not the rate directly)
  let totalPnL = 0;
  
  for (const option of options) {
    totalPnL += calculateOptionPayoff(option, spotAtExpiry, includePremium);
  }
  
  // Return the PnL as this will be added to the unhedged rate (spot) in the UI components
  // to get the effective hedged rate (spotAtExpiry + PnL)
  return totalPnL;
};

// Improved risk-reward metrics calculation for a strategy
export const calculateRiskReward = (
  options: OptionComponent[], 
  initialSpot: number, 
  params: any, 
  includePremium: boolean = true
) => {
  const minSpot = initialSpot * 0.7;
  const maxSpot = initialSpot * 1.3;
  const numSteps = 100;
  const step = (maxSpot - minSpot) / numSteps;
  
  let bestCase = -Infinity;
  let worstCase = Infinity;
  let bestCaseSpot = initialSpot;
  let worstCaseSpot = initialSpot;
  let breakEvenPoints: number[] = [];
  
  let previousPayoff = calculateCustomStrategyPayoff(options, minSpot, initialSpot, params, includePremium);
  
  for (let spot = minSpot + step; spot <= maxSpot; spot += step) {
    const payoff = calculateCustomStrategyPayoff(options, spot, initialSpot, params, includePremium);
    
    // Detect break-even points (where payoff crosses zero)
    if ((previousPayoff < 0 && payoff >= 0) || (previousPayoff > 0 && payoff <= 0)) {
      // Linear interpolation to find the precise break-even point
      const breakEvenSpot = spot - step * (payoff / (payoff - previousPayoff));
      breakEvenPoints.push(parseFloat(breakEvenSpot.toFixed(4)));
    }
    
    previousPayoff = payoff;
    
    // Calculate relative payoff (payoff compared to unhedged position)
    const unhedgedPayoff = spot - initialSpot;
    const relativePayoff = payoff - unhedgedPayoff;
    
    if (relativePayoff > bestCase) {
      bestCase = relativePayoff;
      bestCaseSpot = spot;
    }
    
    if (relativePayoff < worstCase) {
      worstCase = relativePayoff;
      worstCaseSpot = spot;
    }
  }
  
  // Calculate risk-reward ratio (absolute value of best case divided by worst case)
  const riskRewardRatio = worstCase !== 0 ? Math.abs(bestCase / worstCase) : 
                          (bestCase > 0 ? Infinity : 0);
  
  return {
    bestCase,
    worstCase,
    bestCaseSpot,
    worstCaseSpot,
    riskRewardRatio,
    breakEvenPoints
  };
};
