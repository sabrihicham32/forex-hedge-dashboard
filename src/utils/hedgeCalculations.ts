import { erf } from 'mathjs';

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
) => {
  const { spot, strikeUpper, strikeLower, strikeMid, barrierUpper, barrierLower, maturity, r1, r2, vol } = params;
  
  switch(selectedStrategy) {
    case 'collar':
      return findCollarEquivalentStrike({
        spot, 
        strikeUpper, 
        strikeLower, 
        maturity, 
        r1, 
        r2, 
        vol
      });
    
    case 'forward':
      const forwardRate = calculateForward(spot, maturity, r1, r2);
      return {
        forwardRate,
        details: `Taux à terme fixé à ${forwardRate.toFixed(4)}`
      };
    
    case 'strangle':
      const putPrice = calculatePut(spot, strikeLower, maturity, r1, r2, vol);
      const callPrice = calculateCall(spot, strikeUpper, maturity, r1, r2, vol);
      return {
        putStrike: strikeLower,
        callStrike: strikeUpper,
        putPrice,
        callPrice,
        totalPremium: putPrice + callPrice
      };
    
    case 'straddle':
      const atMoneyPut = calculatePut(spot, spot, maturity, r1, r2, vol);
      const atMoneyCall = calculateCall(spot, spot, maturity, r1, r2, vol);
      return {
        strike: spot,
        putPrice: atMoneyPut,
        callPrice: atMoneyCall,
        totalPremium: atMoneyPut + atMoneyCall
      };
    
    case 'put':
      const simplePutPrice = calculatePut(spot, strikeLower, maturity, r1, r2, vol);
      return {
        putStrike: strikeLower,
        putPrice: simplePutPrice
      };
    
    case 'call':
      const simpleCallPrice = calculateCall(spot, strikeUpper, maturity, r1, r2, vol);
      return {
        callStrike: strikeUpper,
        callPrice: simpleCallPrice
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
        netPremium
      };
    
    case 'callKO':
      // Call with Knock-Out barrier
      const callKOPrice = calculateBarrierOption('call', spot, strikeUpper, barrierUpper, maturity, r1, r2, vol, false);
      return {
        callStrike: strikeUpper,
        barrier: barrierUpper,
        callPrice: callKOPrice,
        details: "Call KO désactivé si le taux dépasse la barrière"
      };
    
    case 'putKI':
      // Put with Knock-In barrier
      const putKIPrice = calculateBarrierOption('put', spot, strikeLower, barrierUpper, maturity, r1, r2, vol, true);
      return {
        putStrike: strikeLower,
        barrier: barrierUpper,
        putPrice: putKIPrice,
        details: "Put KI activé si le taux dépasse la barrière"
      };
    
    case 'callPutKI_KO':
      // Combination of Call KO and Put KI
      const comboCallKOPrice = calculateBarrierOption('call', spot, strikeUpper, barrierUpper, maturity, r1, r2, vol, false);
      const comboPutKIPrice = calculateBarrierOption('put', spot, strikeLower, barrierLower, maturity, r1, r2, vol, true);
      
      return {
        callStrike: strikeUpper,
        putStrike: strikeLower,
        barrierUpper: barrierUpper,
        barrierLower: barrierLower,
        callPrice: comboCallKOPrice,
        putPrice: comboPutKIPrice,
        totalPremium: comboCallKOPrice + comboPutKIPrice,
        details: "Stratégie pour profiter d'une baisse jusqu'à la barrière"
      };
    
    default:
      return null;
  }
};

// Calculate payoff data for chart
export const calculatePayoff = (
  results: any, 
  selectedStrategy: string, 
  params: any, 
  includePremium: boolean = true
) => {
  if (!results) return [];
  
  const spots = [];
  const minSpot = params.spot * 0.7;
  const maxSpot = params.spot * 1.3;
  const step = (maxSpot - minSpot) / 100;

  for (let spot = minSpot; spot <= maxSpot; spot += step) {
    const noHedgePayoff = spot;
    let hedgedPayoff;

    switch(selectedStrategy) {
      case 'collar':
        hedgedPayoff = Math.min(Math.max(spot, results.putStrike), results.callStrike);
        break;
      
      case 'forward':
        hedgedPayoff = results.forwardRate;
        break;
      
      case 'strangle':
        // Start with the spot price
        hedgedPayoff = spot;
        
        // Apply put protection (if spot falls below put strike)
        if (spot < results.putStrike) {
          hedgedPayoff = results.putStrike;
        }
        
        // Apply call cap (if spot rises above call strike)
        if (spot > results.callStrike) {
          hedgedPayoff = results.callStrike;
        }
        
        // Adjust for premium cost if includePremium is true
        if (includePremium && results.totalPremium) {
          hedgedPayoff -= results.totalPremium;
        }
        break;
      
      case 'straddle':
        // Start with spot price
        hedgedPayoff = spot;
        
        // Apply put protection
        if (spot < results.strike) {
          hedgedPayoff = results.strike;
        }
        
        // Apply call cap
        if (spot > results.strike) {
          hedgedPayoff = results.strike;
        }
        
        // Adjust for premium cost if includePremium is true
        if (includePremium && results.totalPremium) {
          hedgedPayoff -= results.totalPremium;
        }
        break;
      
      case 'put':
        // Start with the spot price
        hedgedPayoff = spot;
        
        // Apply put protection if spot falls below put strike
        if (spot < results.putStrike) {
          hedgedPayoff = results.putStrike;
        }
        
        // Adjust for premium cost if includePremium is true
        if (includePremium && results.putPrice) {
          hedgedPayoff -= results.putPrice;
        }
        break;
      
      case 'call':
        // Start with the spot price
        hedgedPayoff = spot;
        
        // Apply call cap if spot rises above call strike
        if (spot > results.callStrike) {
          hedgedPayoff = results.callStrike;
        }
        
        // Adjust for premium cost if includePremium is true
        if (includePremium && results.callPrice) {
          hedgedPayoff -= results.callPrice;
        }
        break;
      
      case 'seagull':
        // Start with the spot price
        hedgedPayoff = spot;
        
        if (spot < results.putSellStrike) {
          // Below the sold put strike - lose protection
          hedgedPayoff = results.putSellStrike - (results.putSellStrike - spot);
        } else if (spot < results.putBuyStrike) {
          // Between sold put and bought put - have protection
          hedgedPayoff = results.putBuyStrike;
        } else if (spot > results.callSellStrike) {
          // Above sold call strike - capped upside
          hedgedPayoff = results.callSellStrike;
        }
        
        // Adjust for net premium if includePremium is true
        if (includePremium && results.netPremium) {
          hedgedPayoff -= results.netPremium;
        }
        break;
      
      case 'callKO':
        // Start with the spot price
        hedgedPayoff = spot;
        
        // Check if barrier is hit
        const callKoBarrierActive = spot < results.barrier; // KO option is inactive if spot >= barrier
        
        if (callKoBarrierActive) {
          // Apply call cap if spot is above strike and barrier not hit
          if (spot > results.callStrike) {
            hedgedPayoff = results.callStrike;
          }
        }
        
        // Adjust for premium cost if includePremium is true
        if (includePremium && results.callPrice) {
          hedgedPayoff -= results.callPrice;
        }
        break;
      
      case 'putKI':
        // Start with the spot price
        hedgedPayoff = spot;
        
        // Check if barrier is hit
        const putKiBarrierActive = spot >= results.barrier; // KI option is active if spot >= barrier
        
        if (putKiBarrierActive) {
          // Apply put floor if spot is below strike and barrier is hit
          if (spot < results.putStrike) {
            hedgedPayoff = results.putStrike;
          }
        }
        
        // Adjust for premium cost if includePremium is true
        if (includePremium && results.putPrice) {
          hedgedPayoff -= results.putPrice;
        }
        break;
      
      case 'callPutKI_KO':
        // Start with the spot price
        hedgedPayoff = spot;
        
        // Check if call with KO upper barrier is active
        const callKoActive = spot < results.barrierUpper; // KO Call is active if spot < upper barrier
        
        if (callKoActive) {
          // Call is active, apply cap if needed
          if (spot > results.callStrike) {
            hedgedPayoff = results.callStrike;
          }
        }
        
        // Check if put with KI lower barrier is active
        const putKiActive = spot <= results.barrierLower; // KI Put is active if spot <= lower barrier
        
        if (putKiActive) {
          // Put is active, apply floor if needed
          if (spot < results.putStrike) {
            hedgedPayoff = results.putStrike;
          }
        }
        
        // Adjust for premium costs if includePremium is true
        if (includePremium && results.totalPremium) {
          hedgedPayoff -= results.totalPremium;
        }
        break;
      
      default:
        hedgedPayoff = spot;
    }
    
    const dataPoint: any = {
      spot: parseFloat(spot.toFixed(4)),
      'Hedged Rate': parseFloat(hedgedPayoff.toFixed(4)),
      'Unhedged Rate': parseFloat(noHedgePayoff.toFixed(4)),
      'Initial Spot': parseFloat(params.spot.toFixed(4))
    };
    
    // Add relevant strikes based on strategy
    if (selectedStrategy === 'collar') {
      dataPoint['Put Strike'] = parseFloat(results.putStrike.toFixed(4));
      dataPoint['Call Strike'] = parseFloat(results.callStrike.toFixed(4));
    } else if (selectedStrategy === 'strangle') {
      dataPoint['Put Strike'] = parseFloat(results.putStrike.toFixed(4));
      dataPoint['Call Strike'] = parseFloat(results.callStrike.toFixed(4));
    } else if (selectedStrategy === 'straddle') {
      dataPoint['Strike'] = parseFloat(results.strike.toFixed(4));
    } else if (selectedStrategy === 'put') {
      dataPoint['Put Strike'] = parseFloat(results.putStrike.toFixed(4));
    } else if (selectedStrategy === 'call') {
      dataPoint['Call Strike'] = parseFloat(results.callStrike.toFixed(4));
    } else if (selectedStrategy === 'seagull') {
      dataPoint['Put Sell Strike'] = parseFloat(results.putSellStrike.toFixed(4));
      dataPoint['Put Buy Strike'] = parseFloat(results.putBuyStrike.toFixed(4));
      dataPoint['Call Sell Strike'] = parseFloat(results.callSellStrike.toFixed(4));
    }
    
    if (selectedStrategy === 'callKO') {
      dataPoint['Call Strike'] = parseFloat(results.callStrike.toFixed(4));
      dataPoint['KO Barrier'] = parseFloat(results.barrier.toFixed(4));
    } else if (selectedStrategy === 'putKI') {
      dataPoint['Put Strike'] = parseFloat(results.putStrike.toFixed(4));
      dataPoint['KI Barrier'] = parseFloat(results.barrier.toFixed(4));
    } else if (selectedStrategy === 'callPutKI_KO') {
      dataPoint['Call Strike'] = parseFloat(results.callStrike.toFixed(4));
      dataPoint['Put Strike'] = parseFloat(results.putStrike.toFixed(4));
      dataPoint['Upper Barrier'] = parseFloat(results.barrierUpper.toFixed(4));
      dataPoint['Lower Barrier'] = parseFloat(results.barrierLower.toFixed(4));
    }
    
    spots.push(dataPoint);
  }

  return spots;
};
