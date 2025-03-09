
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
    premium = adjustPremiumForBarriers(option, spot, premium);
  }
  
  // Apply quantity (as percentage)
  return premium * (option.quantity / 100);
};

// Calculate call option premium using Black-Scholes
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

// Adjust premium for barrier options
const adjustPremiumForBarriers = (option: OptionComponent, spot: number, premium: number) => {
  // Get actual barrier values
  const actualUpperBarrier = option.upperBarrier 
    ? (option.upperBarrierType === "percentage" ? spot * (option.upperBarrier / 100) : option.upperBarrier)
    : undefined;
    
  const actualLowerBarrier = option.lowerBarrier 
    ? (option.lowerBarrierType === "percentage" ? spot * (option.lowerBarrier / 100) : option.lowerBarrier)
    : undefined;
  
  let adjustmentFactor = 1.0;
  
  if (option.type === "call") {
    // Call with upper barrier (knock-out)
    if (actualUpperBarrier && !actualLowerBarrier) {
      // Further from barrier = higher premium
      adjustmentFactor = Math.min(1, (actualUpperBarrier - spot) / (0.1 * spot));
    }
    // Call with lower barrier (knock-in)
    else if (actualLowerBarrier && !actualUpperBarrier) {
      // Closer to barrier = higher premium
      adjustmentFactor = Math.max(0, Math.min(1, (spot - actualLowerBarrier) / (0.1 * spot)));
    }
  } else { // Put
    // Put with upper barrier (knock-in)
    if (actualUpperBarrier && !actualLowerBarrier) {
      // Closer to barrier = higher premium
      adjustmentFactor = Math.max(0, Math.min(1, (actualUpperBarrier - spot) / (0.1 * spot)));
    }
    // Put with lower barrier (knock-out)
    else if (actualLowerBarrier && !actualUpperBarrier) {
      // Further from barrier = higher premium
      adjustmentFactor = Math.min(1, (spot - actualLowerBarrier) / (0.1 * spot));
    }
  }
  
  return premium * adjustmentFactor;
};

// Calculate option payoff at expiration for a specific spot price
export const calculateOptionPayoff = (option: OptionComponent, spotAtExpiry: number): number => {
  if (!option.actualStrike) {
    return 0; // No valid strike, no payoff
  }
  
  // First determine if barriers have been triggered
  let isActive = true;
  
  // Check if KO or KI barriers are hit
  if (option.actualUpperBarrier) {
    if (option.type === "call" && !option.actualLowerBarrier) {
      // Call KO with upper barrier
      isActive = spotAtExpiry <= option.actualUpperBarrier;
    } else if (option.type === "put" && !option.actualLowerBarrier) {
      // Put KI with upper barrier
      isActive = spotAtExpiry >= option.actualUpperBarrier;
    }
  }
  
  if (option.actualLowerBarrier) {
    if (option.type === "call" && !option.actualUpperBarrier) {
      // Call KI with lower barrier
      isActive = spotAtExpiry >= option.actualLowerBarrier;
    } else if (option.type === "put" && !option.actualUpperBarrier) {
      // Put KO with lower barrier
      isActive = spotAtExpiry >= option.actualLowerBarrier;
    }
  }
  
  // Double barrier
  if (option.actualUpperBarrier && option.actualLowerBarrier) {
    if (option.type === "call") {
      isActive = spotAtExpiry <= option.actualUpperBarrier && spotAtExpiry >= option.actualLowerBarrier;
    } else {
      isActive = spotAtExpiry >= option.actualLowerBarrier && spotAtExpiry <= option.actualUpperBarrier;
    }
  }
  
  if (!isActive) {
    return 0;
  }
  
  // Calculate basic payoff (intrinsic value)
  let payoff = 0;
  
  if (option.type === "call") {
    // For a call, payoff is max(0, spot - strike)
    payoff = Math.max(0, spotAtExpiry - option.actualStrike);
  } else if (option.type === "put") {
    // For a put, payoff is max(0, strike - spot)
    payoff = Math.max(0, option.actualStrike - spotAtExpiry);
  }
  
  // Apply quantity (as percentage)
  payoff = payoff * (option.quantity / 100);
  
  // Subtract premium (cost of option)
  if (option.premium) {
    payoff -= option.premium;
  }
  
  return payoff;
};

// Calculate the payoff for a custom strategy with multiple options
export const calculateCustomStrategyPayoff = (options: OptionComponent[], spotAtExpiry: number, initialSpot: number, params: any): number => {
  // Calculate payoff for each option and sum
  let totalPayoff = 0;
  
  for (const option of options) {
    // Calculate individual option payoff
    const payoff = calculateOptionPayoff(option, spotAtExpiry);
    totalPayoff += payoff;
  }
  
  return totalPayoff;
};

// Calculate risk-reward metrics for a strategy
export const calculateRiskReward = (options: OptionComponent[], initialSpot: number, params: any) => {
  const minSpot = initialSpot * 0.7;
  const maxSpot = initialSpot * 1.3;
  const numSteps = 100;
  const step = (maxSpot - minSpot) / numSteps;
  
  let bestCase = -Infinity;
  let worstCase = Infinity;
  let bestCaseSpot = initialSpot;
  let worstCaseSpot = initialSpot;
  
  for (let spot = minSpot; spot <= maxSpot; spot += step) {
    const payoff = calculateCustomStrategyPayoff(options, spot, initialSpot, params);
    
    if (payoff > bestCase) {
      bestCase = payoff;
      bestCaseSpot = spot;
    }
    
    if (payoff < worstCase) {
      worstCase = payoff;
      worstCaseSpot = spot;
    }
  }
  
  // Calculate risk-reward ratio
  const riskRewardRatio = worstCase !== 0 ? Math.abs(bestCase / worstCase) : Infinity;
  
  return {
    bestCase,
    worstCase,
    bestCaseSpot,
    worstCaseSpot,
    riskRewardRatio
  };
};
