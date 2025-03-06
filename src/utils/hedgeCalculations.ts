
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
    maturity: number;
    r1: number;
    r2: number;
    vol: number;
  }
) => {
  const { spot, strikeUpper, strikeLower, strikeMid, maturity, r1, r2, vol } = params;
  
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
    
    default:
      return null;
  }
};

// Calculate payoff data for chart
export const calculatePayoff = (results: any, selectedStrategy: string, params: any) => {
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
        if (spot < results.putStrike) {
          hedgedPayoff = results.putStrike; // Put protection
        } else if (spot > results.callStrike) {
          hedgedPayoff = results.callStrike; // Call protection
        } else {
          hedgedPayoff = spot; // Between strikes, no protection
        }
        // Adjust for premium cost
        hedgedPayoff -= results.totalPremium;
        break;
      
      case 'straddle':
        hedgedPayoff = results.strike; // Protection in both directions
        // Adjust for premium cost
        hedgedPayoff -= results.totalPremium;
        break;
      
      case 'put':
        hedgedPayoff = Math.max(spot, results.putStrike);
        // Adjust for premium cost
        hedgedPayoff -= results.putPrice;
        break;
      
      case 'call':
        hedgedPayoff = Math.min(spot, results.callStrike);
        // Adjust for premium cost
        hedgedPayoff -= results.callPrice;
        break;
      
      case 'seagull':
        if (spot < results.putSellStrike) {
          // If very low, lose put protection
          hedgedPayoff = spot + (results.putSellStrike - spot);
        } else if (spot < results.putBuyStrike) {
          // Protection from bought put
          hedgedPayoff = results.putBuyStrike;
        } else if (spot > results.callSellStrike) {
          // Limited by sold call
          hedgedPayoff = results.callSellStrike;
        } else {
          // Between put and call, no protection
          hedgedPayoff = spot;
        }
        // Adjust for net premium
        hedgedPayoff -= results.netPremium;
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
    
    spots.push(dataPoint);
  }

  return spots;
};
