import { erf } from 'mathjs';

// Define base types for different strategy results
interface BaseStrategyResult {
  totalPremium: number;
  netPremium: number;
}

interface CollaredResult extends BaseStrategyResult {
  putStrike: number;
  callStrike: number;
  putPrice: number;
  callPrice: number;
}

interface ForwardResult extends BaseStrategyResult {
  forwardRate: number;
  details: string;
}

interface StrangleResult extends BaseStrategyResult {
  putStrike: number;
  callStrike: number;
  putPrice: number;
  callPrice: number;
}

interface BarrierResult extends BaseStrategyResult {
  callStrike?: number;
  putStrike?: number;
  barrier: number;
  callPrice?: number;
  putPrice?: number;
  details: string;
}

type StrategyResult = CollaredResult | ForwardResult | StrangleResult | BarrierResult;

// Black-Scholes option pricing for Forex
export const calculateD1D2 = (S: number, K: number, T: number, r1: number, r2: number, sigma: number) => {
  const d1 = (Math.log(S/K) + (r1 - r2 + Math.pow(sigma, 2)/2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return [d1, d2];
};

export const calculateCall = (S: number, K: number, T: number, r1: number, r2: number, sigma: number) => {
  const [d1, d2] = calculateD1D2(S, K, T, r1, r2, sigma);
  const nd1 = (1 + erf(d1/Math.sqrt(2)))/2;
  const nd2 = (1 + erf(d2/Math.sqrt(2)))/2;
  return S * Math.exp(-r2*T) * nd1 - K * Math.exp(-r1*T) * nd2;
};

export const calculatePut = (S: number, K: number, T: number, r1: number, r2: number, sigma: number) => {
  const [d1, d2] = calculateD1D2(S, K, T, r1, r2, sigma);
  const nd1 = (1 + erf(-d1/Math.sqrt(2)))/2;
  const nd2 = (1 + erf(-d2/Math.sqrt(2)))/2;
  return K * Math.exp(-r1*T) * nd2 - S * Math.exp(-r2*T) * nd1;
};

// Forward rate calculation
export const calculateForward = (S: number, T: number, r1: number, r2: number) => {
  return S * Math.exp((r1 - r2) * T);
};

// Function to check if barrier is active
export const isBarrierActive = (type: string, S: number, B: number, isKnockIn: boolean, isUpperBarrier: boolean) => {
  // Barrier event check
  if (type === 'call') {
    if (isKnockIn) {
      // Call KI - active only if barrier condition has been met
      return isUpperBarrier ? S >= B : S <= B;
    } else {
      // Call KO - inactive if barrier condition has been met
      return isUpperBarrier ? S < B : S > B;
    }
  } else { // Put
    if (isKnockIn) {
      // Put KI - active only if barrier condition has been met
      return isUpperBarrier ? S >= B : S <= B;
    } else {
      // Put KO - inactive if barrier condition has been met
      return isUpperBarrier ? S < B : S > B;
    }
  }
};

// Calculate barrier option prices
export const calculateBarrierOption = (type: string, S: number, K: number, B: number, T: number, r1: number, r2: number, sigma: number, isKnockIn: boolean) => {
  // Get standard option price
  const standardPrice = type === 'call' 
    ? calculateCall(S, K, T, r1, r2, sigma) 
    : calculatePut(S, K, T, r1, r2, sigma);
  
  // Determine if we're dealing with upper or lower barrier
  const isUpperBarrier = B > S;
  
  // Adjust price based on barrier proximity
  let barrierFactor = 1.0;
  
  if (isKnockIn) {
    // For knock-in, closer to barrier = higher premium
    barrierFactor = Math.max(0.5, Math.min(0.9, 1 - Math.abs(B - S) / (0.3 * S)));
  } else {
    // For knock-out, further from barrier = higher premium
    barrierFactor = Math.max(0.5, Math.min(0.9, Math.abs(B - S) / (0.3 * S)));
  }
  
  return standardPrice * barrierFactor;
};

// Find equivalent strike for zero-cost collar
export const findCollarEquivalentStrike = (params: {
  spot: number;
  strikeUpper: number | null;
  strikeLower: number | null;
  maturity: number;
  r1: number;
  r2: number;
  vol: number;
}) => {
  const { spot, strikeUpper, strikeLower, maturity, r1, r2, vol } = params;
  
  if (strikeUpper && !strikeLower) {
    // Start with Call to find equivalent Put
    const callPrice = calculateCall(
      spot,
      strikeUpper,
      maturity,
      r1,
      r2,
      vol
    );

    let left = 0.8 * spot;
    let right = strikeUpper;
    let mid;
    const tolerance = 0.0001;

    while (right - left > tolerance) {
      mid = (left + right) / 2;
      const putPrice = calculatePut(
        spot,
        mid,
        maturity,
        r1,
        r2,
        vol
      );

      if (putPrice > callPrice) {
        right = mid;
      } else {
        left = mid;
      }
    }

    return {
      callStrike: strikeUpper,
      putStrike: mid,
      callPrice: callPrice,
      putPrice: callPrice // By design, equal to call price
    };
  } else if (strikeLower) {
    // Start with Put to find equivalent Call
    const putPrice = calculatePut(
      spot,
      strikeLower,
      maturity,
      r1,
      r2,
      vol
    );

    let left = strikeLower;
    let right = 1.2 * spot;
    let mid;
    const tolerance = 0.0001;

    while (right - left > tolerance) {
      mid = (left + right) / 2;
      const callPrice = calculateCall(
        spot,
        mid,
        maturity,
        r1,
        r2,
        vol
      );

      if (callPrice > putPrice) {
        left = mid;
      } else {
        right = mid;
      }
    }

    return {
      putStrike: strikeLower,
      callStrike: mid,
      putPrice: putPrice,
      callPrice: putPrice // By design, equal to put price
    };
  } else {
    // Default case if neither strike is provided
    return {
      putStrike: spot * 0.95,
      callStrike: spot * 1.05,
      putPrice: 0,
      callPrice: 0
    };
  }
};

// Calculate strategy results based on selected strategy
export const calculateStrategyResults = (
  selectedStrategy: string,
  params: {
    spot: number;
    strikeUpper: number;
    strikeLower: number;
    strikeMid: number;
    barrierUpper: number;
    barrierLower: number;
    maturity: number;
    r1: number;
    r2: number;
    vol: number;
  }
): StrategyResult => {
  const { spot, strikeUpper, strikeLower, strikeMid, barrierUpper, barrierLower, maturity, r1, r2, vol } = params;
  
  switch(selectedStrategy) {
    case 'collar': {
      const putPrice = calculatePut(spot, strikeLower, maturity, r1, r2, vol);
      const callPrice = calculateCall(spot, strikeUpper, maturity, r1, r2, vol);
      return {
        putStrike: strikeLower,
        callStrike: strikeUpper,
        putPrice,
        callPrice,
        totalPremium: putPrice + callPrice,
        netPremium: putPrice + callPrice
      };
    }
    
    case 'forward':
      return {
        forwardRate: calculateForward(spot, maturity, r1, r2),
        details: `Forward rate fixed at ${calculateForward(spot, maturity, r1, r2).toFixed(4)}`,
        totalPremium: 0,
        netPremium: 0
      };
    
    case 'strangle': {
      const putPrice = calculatePut(spot, strikeLower, maturity, r1, r2, vol);
      const callPrice = calculateCall(spot, strikeUpper, maturity, r1, r2, vol);
      return {
        putStrike: strikeLower,
        callStrike: strikeUpper,
        putPrice,
        callPrice,
        totalPremium: putPrice + callPrice,
        netPremium: putPrice + callPrice
      };
    }
    
    case 'straddle':
      const atMoneyPut = calculatePut(spot, spot, maturity, r1, r2, vol);
      const atMoneyCall = calculateCall(spot, spot, maturity, r1, r2, vol);
      return {
        strike: spot,
        putPrice: atMoneyPut,
        callPrice: atMoneyCall,
        totalPremium: atMoneyPut + atMoneyCall,
        netPremium: atMoneyPut + atMoneyCall
      };
    
    case 'put':
      const simplePutPrice = calculatePut(spot, strikeLower, maturity, r1, r2, vol);
      return {
        putStrike: strikeLower,
        putPrice: simplePutPrice,
        totalPremium: simplePutPrice,
        netPremium: simplePutPrice
      };
    
    case 'call':
      const simpleCallPrice = calculateCall(spot, strikeUpper, maturity, r1, r2, vol);
      return {
        callStrike: strikeUpper,
        callPrice: simpleCallPrice,
        totalPremium: simpleCallPrice,
        netPremium: simpleCallPrice
      };
    
    case 'seagull':
      // Buy a put, sell an OTM call, sell an OTM put
      const seagullPutBuy = calculatePut(spot, strikeMid, maturity, r1, r2, vol);
      const seagullCallSell = calculateCall(spot, strikeUpper, maturity, r1, r2, vol);
      const seagullPutSell = calculatePut(spot, strikeLower, maturity, r1, r2, vol);
      const netPremium = seagullPutBuy - seagullCallSell - seagullPutSell;
      
      return {
        putBuyStrike: strikeMid,
        callSellStrike: strikeUpper,
        putSellStrike: strikeLower,
        putBuyPrice: seagullPutBuy,
        callSellPrice: seagullCallSell,
        putSellPrice: seagullPutSell,
        netPremium,
        totalPremium: netPremium
      };
    
    case 'callKO':
      // Call with Knock-Out barrier
      const callKOPrice = calculateBarrierOption('call', spot, strikeUpper, barrierUpper, maturity, r1, r2, vol, false);
      return {
        callStrike: strikeUpper,
        barrier: barrierUpper,
        callPrice: callKOPrice,
        details: "Call KO désactivé si le taux dépasse la barrière",
        totalPremium: callKOPrice,
        netPremium: callKOPrice
      };
    
    case 'putKI':
      // Put with Knock-In barrier
      const putKIPrice = calculateBarrierOption('put', spot, strikeLower, barrierUpper, maturity, r1, r2, vol, true);
      return {
        putStrike: strikeLower,
        barrier: barrierUpper,
        putPrice: putKIPrice,
        details: "Put KI activé si le taux dépasse la barrière",
        totalPremium: putKIPrice,
        netPremium: putKIPrice
      };
    
    case 'callPutKI_KO':
      // Combination of Call KO and Put KI
      const comboCallKOPrice = calculateBarrierOption('call', spot, strikeUpper, barrierUpper, maturity, r1, r2, vol, false);
      const comboPutKIPrice = calculateBarrierOption('put', spot, strikeLower, barrierLower, maturity, r1, r2, vol, true);
      const comboTotalPremium = comboCallKOPrice + comboPutKIPrice;
      
      return {
        callStrike: strikeUpper,
        putStrike: strikeLower,
        barrier: barrierUpper,
        callPrice: comboCallKOPrice,
        putPrice: comboPutKIPrice,
        totalPremium: comboTotalPremium,
        netPremium: comboTotalPremium,
        details: "Stratégie pour profiter d'une baisse jusqu'à la barrière"
      };
    
    default:
      return {
        callStrike: spot,
        putStrike: spot,
        totalPremium: 0,
        netPremium: 0,
        callPrice: 0,
        putPrice: 0
      };
  }
};

// Calculate payoff data for chart
export const calculatePayoff = (
  results: StrategyResult,
  selectedStrategy: string,
  params: any,
  includePremium: boolean = true
) => {
  if (!results) return [];
  
  const spots = [];
  const minSpot = params.spot * 0.7;
  const maxSpot = params.spot * 1.3;
  const step = (maxSpot - minSpot) / 100;

  // Calculate payoff for each spot price
  for (let spot = minSpot; spot <= maxSpot; spot += step) {
    // Base payoff is the spot itself (unhedged position)
    const noHedgePayoff = spot;
    let hedgedPayoff = spot; // Start with spot as base
    let payoffAdjustment = 0;

    switch(selectedStrategy) {
      case 'collar':
        // Long put + Short call
        if (spot < results.putStrike) {
          payoffAdjustment = results.putStrike - spot;
        } else if (spot > results.callStrike) {
          payoffAdjustment = results.callStrike - spot;
        }
        if (includePremium && results.totalPremium) {
          payoffAdjustment -= results.totalPremium;
        }
        hedgedPayoff = spot + payoffAdjustment;
        break;
      
      case 'forward':
        hedgedPayoff = results.forwardRate;
        break;
      
      case 'strangle':
        // Long put + Long call
        if (spot < results.putStrike) {
          payoffAdjustment = results.putStrike - spot;
        } else if (spot > results.callStrike) {
          payoffAdjustment = spot - results.callStrike;
        }
        if (includePremium && results.totalPremium) {
          payoffAdjustment -= results.totalPremium;
        }
        hedgedPayoff = spot + payoffAdjustment;
        break;
      
      case 'straddle':
        // Long put + Long call at same strike
        if (spot < results.strike) {
          payoffAdjustment = results.strike - spot;
        } else if (spot > results.strike) {
          payoffAdjustment = spot - results.strike;
        }
        if (includePremium && results.totalPremium) {
          payoffAdjustment -= results.totalPremium;
        }
        hedgedPayoff = spot + payoffAdjustment;
        break;
      
      case 'put':
        // Long put only
        if (spot < results.putStrike) {
          payoffAdjustment = results.putStrike - spot;
        }
        if (includePremium && results.putPrice) {
          payoffAdjustment -= results.putPrice;
        }
        hedgedPayoff = spot + payoffAdjustment;
        break;
      
      case 'call':
        // Long call only
        if (spot > results.callStrike) {
          payoffAdjustment = results.callStrike - spot;
        }
        if (includePremium && results.callPrice) {
          payoffAdjustment -= results.callPrice;
        }
        hedgedPayoff = spot + payoffAdjustment;
        break;
      
      case 'seagull':
        // Long put (mid) + Short call (high) + Short put (low)
        if (spot < results.putSellStrike) {
          // Below low strike - lose protection from short put
          payoffAdjustment = -(spot - results.putSellStrike);
        } else if (spot < results.putBuyStrike) {
          // Between low and mid - full protection from long put
          payoffAdjustment = results.putBuyStrike - spot;
        } else if (spot > results.callSellStrike) {
          // Above high strike - capped from short call
          payoffAdjustment = results.callSellStrike - spot;
        }
        if (includePremium && results.netPremium) {
          payoffAdjustment -= results.netPremium;
        }
        hedgedPayoff = spot + payoffAdjustment;
        break;
      
      case 'callKO':
        // Call with Knock-Out barrier
        const isCallKoActive = spot < results.barrier;
        if (isCallKoActive && spot > results.callStrike) {
          payoffAdjustment = results.callStrike - spot;
        }
        if (includePremium && results.callPrice) {
          payoffAdjustment -= results.callPrice;
        }
        hedgedPayoff = spot + payoffAdjustment;
        break;
      
      case 'putKI':
        // Put with Knock-In barrier
        const isPutKiActive = spot <= results.barrier;
        if (isPutKiActive && spot < results.putStrike) {
          payoffAdjustment = results.putStrike - spot;
        }
        if (includePremium && results.putPrice) {
          payoffAdjustment -= results.putPrice;
        }
        hedgedPayoff = spot + payoffAdjustment;
        break;
      
      case 'callPutKI_KO':
        // Combination of Call KO and Put KI
        const isComboCallKoActive = spot < results.barrier;
        const isComboPutKiActive = spot <= results.barrier;
        
        if (isComboCallKoActive && spot > results.callStrike) {
          payoffAdjustment += results.callStrike - spot;
        }
        if (isComboPutKiActive && spot < results.putStrike) {
          payoffAdjustment += results.putStrike - spot;
        }
        if (includePremium && results.totalPremium) {
          payoffAdjustment -= results.totalPremium;
        }
        hedgedPayoff = spot + payoffAdjustment;
        break;
    }
    
    // Ensure hedged payoff can't be negative
    hedgedPayoff = Math.max(0, hedgedPayoff);
    
    const dataPoint: any = {
      spot: parseFloat(spot.toFixed(4)),
      'Hedged Rate': parseFloat(hedgedPayoff.toFixed(4)),
      'Unhedged Rate': parseFloat(noHedgePayoff.toFixed(4)),
      'Initial Spot': parseFloat(params.spot.toFixed(4))
    };
    
    // Add strategy-specific reference lines
    if (spots.length === 0) {
      switch(selectedStrategy) {
        case 'collar':
        case 'strangle':
          dataPoint['Put Strike'] = parseFloat(results.putStrike.toFixed(4));
          dataPoint['Call Strike'] = parseFloat(results.callStrike.toFixed(4));
          break;
        case 'straddle':
          dataPoint['Strike'] = parseFloat(results.strike.toFixed(4));
          break;
        case 'put':
          dataPoint['Put Strike'] = parseFloat(results.putStrike.toFixed(4));
          break;
        case 'call':
          dataPoint['Call Strike'] = parseFloat(results.callStrike.toFixed(4));
          break;
        case 'seagull':
          dataPoint['Put Sell Strike'] = parseFloat(results.putSellStrike.toFixed(4));
          dataPoint['Put Buy Strike'] = parseFloat(results.putBuyStrike.toFixed(4));
          dataPoint['Call Sell Strike'] = parseFloat(results.callSellStrike.toFixed(4));
          break;
        case 'callKO':
          dataPoint['Call Strike'] = parseFloat(results.callStrike.toFixed(4));
          dataPoint['KO Barrier'] = parseFloat(results.barrier.toFixed(4));
          break;
        case 'putKI':
          dataPoint['Put Strike'] = parseFloat(results.putStrike.toFixed(4));
          dataPoint['KI Barrier'] = parseFloat(results.barrier.toFixed(4));
          break;
        case 'callPutKI_KO':
          dataPoint['Call Strike'] = parseFloat(results.callStrike.toFixed(4));
          dataPoint['Put Strike'] = parseFloat(results.putStrike.toFixed(4));
          dataPoint['Upper Barrier'] = parseFloat(results.barrier.toFixed(4));
          dataPoint['Lower Barrier'] = parseFloat(results.barrier.toFixed(4));
          break;
      }
    }
    
    spots.push(dataPoint);
  }

  return spots;
};
