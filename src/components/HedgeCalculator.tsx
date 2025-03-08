
import React, { useState, useEffect } from "react";
import { 
  calculateStrategyResults, 
  calculatePayoff,
  calculateCall,
  calculatePut
} from "@/utils/hedgeCalculations";
import { FOREX_PAIRS, STRATEGIES, FOREX_PAIR_CATEGORIES } from "@/utils/forexData";
import PayoffChart from "./PayoffChart";
import StrategyInfo from "./StrategyInfo";
import CustomStrategyBuilder from "./CustomStrategyBuilder";
import type { OptionComponent } from "./CustomStrategyOption";
import { 
  calculateCustomStrategyPayoff, 
  calculateBarrierOptionPayoff,
  calculateOptionPremium
} from "@/utils/barrierOptionCalculations";
import { Section, GlassContainer, Grid, Heading } from "@/components/ui/layout";

const HedgeCalculator = () => {
  const [selectedPair, setSelectedPair] = useState("EUR/USD");
  const [selectedStrategy, setSelectedStrategy] = useState("collar");
  const [results, setResults] = useState<any>(null);
  const [customOptions, setCustomOptions] = useState<OptionComponent[]>([]);
  const [customGlobalParams, setCustomGlobalParams] = useState({
    maturity: 1,
    r1: 0.02,
    r2: 0.03,
    notional: 1000000,
  });
  const [params, setParams] = useState({
    spot: FOREX_PAIRS["EUR/USD"].spot,
    strikeUpper: FOREX_PAIRS["EUR/USD"].defaultStrike,
    strikeLower: FOREX_PAIRS["EUR/USD"].defaultStrike * 0.95,
    strikeMid: FOREX_PAIRS["EUR/USD"].spot,
    barrierUpper: FOREX_PAIRS["EUR/USD"].defaultStrike * 1.05,
    barrierLower: FOREX_PAIRS["EUR/USD"].defaultStrike * 0.9,
    maturity: 1,
    r1: 0.02,
    r2: 0.03,
    vol: FOREX_PAIRS["EUR/USD"].vol,
    premium: 0,
    notional: 1000000,
  });

  const handlePairChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pair = e.target.value;
    setSelectedPair(pair);
    setParams((prev) => ({
      ...prev,
      spot: FOREX_PAIRS[pair as keyof typeof FOREX_PAIRS].spot,
      strikeUpper: FOREX_PAIRS[pair as keyof typeof FOREX_PAIRS].defaultStrike,
      strikeLower: FOREX_PAIRS[pair as keyof typeof FOREX_PAIRS].defaultStrike * 0.95,
      strikeMid: FOREX_PAIRS[pair as keyof typeof FOREX_PAIRS].spot,
      barrierUpper: FOREX_PAIRS[pair as keyof typeof FOREX_PAIRS].defaultStrike * 1.05,
      barrierLower: FOREX_PAIRS[pair as keyof typeof FOREX_PAIRS].defaultStrike * 0.9,
      vol: FOREX_PAIRS[pair as keyof typeof FOREX_PAIRS].vol,
    }));
  };

  const handleStrategyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStrategy = e.target.value;
    setSelectedStrategy(newStrategy);

    if (newStrategy === "seagull" && !params.strikeMid) {
      setParams((prev) => ({ ...prev, strikeMid: params.spot }));
    }
    
    if (newStrategy === "custom" && customOptions.length === 0) {
      setCustomOptions([
        {
          type: "call",
          strike: 105,
          strikeType: "percentage",
          volatility: 20,
          quantity: 100,
        }
      ]);
    }
  };

  const handleCustomStrategyChange = (options: OptionComponent[], globalParams: any) => {
    setCustomOptions(options);
    setCustomGlobalParams(globalParams);
    
    const optionsWithPremiums = options.map(option => {
      const actualStrike = option.strikeType === "percentage" 
        ? params.spot * (option.strike / 100) 
        : option.strike;
        
      const actualUpperBarrier = option.upperBarrier 
        ? (option.upperBarrierType === "percentage" 
            ? params.spot * (option.upperBarrier / 100) 
            : option.upperBarrier)
        : undefined;
        
      const actualLowerBarrier = option.lowerBarrier 
        ? (option.lowerBarrierType === "percentage" 
            ? params.spot * (option.lowerBarrier / 100) 
            : option.lowerBarrier)
        : undefined;
      
      // Use existing premium if available, otherwise calculate it
      const premium = option.premium !== undefined 
        ? option.premium 
        : calculateOptionPremium(option, params.spot, globalParams);
      
      return { 
        ...option, 
        premium,
        actualStrike,
        actualUpperBarrier,
        actualLowerBarrier
      };
    });
    
    const totalPremium = optionsWithPremiums.reduce((sum, option) => sum + (option.premium || 0), 0);
    
    const payoffData = calculateCustomPayoffData(optionsWithPremiums, params, globalParams);
    
    setResults({
      options: optionsWithPremiums,
      totalPremium,
      payoffData,
      globalParams
    });
  };

  const calculateCustomPayoffData = (options: any[], params: any, globalParams: any) => {
    const spots = [];
    const minSpot = params.spot * 0.7;
    const maxSpot = params.spot * 1.3;
    const step = (maxSpot - minSpot) / 100;
    
    for (let spot = minSpot; spot <= maxSpot; spot += step) {
      const unhedgedRate = spot;
      
      const payoff = calculateCustomStrategyPayoff(options, spot, params.spot, globalParams);
      
      const hedgedRate = unhedgedRate + payoff;
      
      const dataPoint: any = {
        spot: parseFloat(spot.toFixed(4)),
        'Unhedged Rate': parseFloat(unhedgedRate.toFixed(4)),
        'Hedged Rate': parseFloat(hedgedRate.toFixed(4)),
        'Initial Spot': parseFloat(params.spot.toFixed(4))
      };
      
      if (spots.length === 0) {
        options.forEach((option, index) => {
          if (option.actualStrike) {
            dataPoint[`Option ${index+1} Strike`] = parseFloat(option.actualStrike.toFixed(4));
          }
          
          if (option.actualUpperBarrier) {
            dataPoint[`Option ${index+1} Upper Barrier`] = parseFloat(option.actualUpperBarrier.toFixed(4));
          }
          
          if (option.actualLowerBarrier) {
            dataPoint[`Option ${index+1} Lower Barrier`] = parseFloat(option.actualLowerBarrier.toFixed(4));
          }
        });
      }
      
      spots.push(dataPoint);
    }
    
    return spots;
  };

  useEffect(() => {
    if (!selectedStrategy) return;
    
    if (selectedStrategy === "custom") {
      if (customOptions.length > 0) {
        handleCustomStrategyChange(customOptions, customGlobalParams);
      }
      return;
    }
    
    const calculatedResults = calculateStrategyResults(selectedStrategy, params);
    
    if (calculatedResults) {
      const payoffData = calculatePayoff(calculatedResults, selectedStrategy, params);
      setResults({
        ...calculatedResults,
        payoffData,
      });
    }
  }, [params, selectedStrategy, customOptions.length === 0]);

  if (!results) return (
    <div className="h-screen flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-8 w-48 bg-muted rounded mb-4"></div>
        <div className="h-4 w-64 bg-muted rounded"></div>
      </div>
    </div>
  );

  return (
    <Section>
      <div className="max-w-6xl mx-auto">
        <Heading level={1} className="font-bold mb-8 text-center">
          Foreign Exchange Hedging Dashboard
        </Heading>
        
        <GlassContainer className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium">
                Currency Pair
                <select
                  value={selectedPair}
                  onChange={handlePairChange}
                  className="input-field mt-1 w-full"
                >
                  {Object.entries(FOREX_PAIR_CATEGORIES).map(([category, pairs]) => (
                    <optgroup key={category} label={category}>
                      {pairs.map((pair) => (
                        <option key={pair} value={pair}>
                          {pair} - {FOREX_PAIRS[pair as keyof typeof FOREX_PAIRS].name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
            </div>
            
            <div>
              <label className="block mb-2 font-medium">
                Hedging Strategy
                <select
                  value={selectedStrategy}
                  onChange={handleStrategyChange}
                  className="input-field mt-1 w-full"
                >
                  {Object.entries(STRATEGIES).map(([key, { name }]) => (
                    <option key={key} value={key}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {selectedStrategy !== "custom" && (
            <div className="mt-6">
              <Heading level={3}>Parameters</Heading>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Spot Rate
                    <input
                      type="number"
                      value={params.spot}
                      onChange={(e) => setParams((prev) => ({ ...prev, spot: parseFloat(e.target.value) }))}
                      step="0.01"
                      className="input-field mt-1"
                    />
                  </label>
                </div>

                {(selectedStrategy === "collar" || selectedStrategy === "strangle" || 
                  selectedStrategy === "call" || selectedStrategy === "seagull" || 
                  selectedStrategy === "callKO" || selectedStrategy === "callPutKI_KO") && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {selectedStrategy === "seagull" ? "Call Sell Strike (High)" : "Call Strike"}
                      <input
                        type="number"
                        value={params.strikeUpper}
                        onChange={(e) => setParams((prev) => ({ ...prev, strikeUpper: parseFloat(e.target.value) }))}
                        step="0.01"
                        className="input-field mt-1"
                      />
                    </label>
                  </div>
                )}

                {(selectedStrategy === "collar" || selectedStrategy === "strangle" || 
                  selectedStrategy === "put" || selectedStrategy === "seagull" || 
                  selectedStrategy === "putKI" || selectedStrategy === "callPutKI_KO") && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {selectedStrategy === "seagull" ? "Put Sell Strike (Low)" : "Put Strike"}
                      <input
                        type="number"
                        value={params.strikeLower}
                        onChange={(e) => setParams((prev) => ({ ...prev, strikeLower: parseFloat(e.target.value) }))}
                        step="0.01"
                        className="input-field mt-1"
                      />
                    </label>
                  </div>
                )}

                {selectedStrategy === "seagull" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Put Buy Strike (Mid)
                      <input
                        type="number"
                        value={params.strikeMid}
                        onChange={(e) => setParams((prev) => ({ ...prev, strikeMid: parseFloat(e.target.value) }))}
                        step="0.01"
                        className="input-field mt-1"
                      />
                    </label>
                  </div>
                )}

                {(selectedStrategy === "callKO" || selectedStrategy === "callPutKI_KO") && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Upper Barrier (KO)
                      <input
                        type="number"
                        value={params.barrierUpper}
                        onChange={(e) => setParams((prev) => ({ ...prev, barrierUpper: parseFloat(e.target.value) }))}
                        step="0.01"
                        className="input-field mt-1"
                      />
                    </label>
                  </div>
                )}

                {(selectedStrategy === "putKI" || selectedStrategy === "callPutKI_KO") && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {selectedStrategy === "callPutKI_KO" ? "Lower Barrier (KI)" : "Barrier (KI)"}
                      <input
                        type="number"
                        value={selectedStrategy === "putKI" ? params.barrierUpper : params.barrierLower}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (selectedStrategy === "putKI") {
                            setParams((prev) => ({ ...prev, barrierUpper: value }));
                          } else {
                            setParams((prev) => ({ ...prev, barrierLower: value }));
                          }
                        }}
                        step="0.01"
                        className="input-field mt-1"
                      />
                    </label>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Volatility (%)
                    <input
                      type="number"
                      value={params.vol * 100}
                      onChange={(e) => setParams((prev) => ({ ...prev, vol: parseFloat(e.target.value) / 100 }))}
                      step="0.1"
                      className="input-field mt-1"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Maturity (years)
                    <input
                      type="number"
                      value={params.maturity}
                      onChange={(e) => setParams((prev) => ({ ...prev, maturity: parseFloat(e.target.value) }))}
                      step="0.25"
                      className="input-field mt-1"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    {selectedPair.split("/")[0]} Rate (%)
                    <input
                      type="number"
                      value={params.r1 * 100}
                      onChange={(e) => setParams((prev) => ({ ...prev, r1: parseFloat(e.target.value) / 100 }))}
                      step="0.1"
                      className="input-field mt-1"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    {selectedPair.split("/")[1]} Rate (%)
                    <input
                      type="number"
                      value={params.r2 * 100}
                      onChange={(e) => setParams((prev) => ({ ...prev, r2: parseFloat(e.target.value) / 100 }))}
                      step="0.1"
                      className="input-field mt-1"
                    />
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Notional Amount
                    <input
                      type="number"
                      value={params.notional}
                      onChange={(e) => setParams((prev) => ({ ...prev, notional: parseFloat(e.target.value) }))}
                      step="100000"
                      className="input-field mt-1"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </GlassContainer>

        {selectedStrategy === "custom" && (
          <CustomStrategyBuilder 
            spot={params.spot} 
            onStrategyChange={handleCustomStrategyChange} 
          />
        )}

        <Grid cols={1} className="mb-8">
          <StrategyInfo 
            selectedStrategy={selectedStrategy} 
            results={results} 
            params={params}
          />
        </Grid>

        <PayoffChart
          data={results.payoffData}
          selectedStrategy={selectedStrategy}
          spot={params.spot}
        />
      </div>
    </Section>
  );
};

export default HedgeCalculator;
