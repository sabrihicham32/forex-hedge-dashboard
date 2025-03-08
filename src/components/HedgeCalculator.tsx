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
  calculateOptionPremium,
  calculateRiskReward
} from "@/utils/barrierOptionCalculations";
import { Section, GlassContainer, Grid, Heading } from "@/components/ui/layout";
import { Plus, Edit2 } from "lucide-react";

interface CustomCurrencyPair {
  name: string;
  symbol: string;
  spot: number;
  vol: number;
  defaultStrike: number;
}

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
  const [riskReward, setRiskReward] = useState<any>(null);
  
  const [customPairs, setCustomPairs] = useState<Record<string, CustomCurrencyPair>>({});
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [newCurrency, setNewCurrency] = useState({
    name: "",
    symbol: "",
    spot: 1.0,
    vol: 10,
  });

  const handlePairChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pair = e.target.value;
    setSelectedPair(pair);

    if (pair.startsWith("custom_")) {
      const customPair = customPairs[pair];
      setParams((prev) => ({
        ...prev,
        spot: customPair.spot,
        strikeUpper: customPair.defaultStrike,
        strikeLower: customPair.defaultStrike * 0.95,
        strikeMid: customPair.spot,
        barrierUpper: customPair.defaultStrike * 1.05,
        barrierLower: customPair.defaultStrike * 0.9,
        vol: customPair.vol / 100,
      }));
    } else {
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
    }
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
    
    const riskRewardMetrics = calculateRiskReward(optionsWithPremiums, params.spot, globalParams);
    setRiskReward(riskRewardMetrics);
    
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
      
      const hedgedRate = spot + payoff;
      
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
  
  const handleAddCustomCurrency = () => {
    if (!newCurrency.symbol || !newCurrency.name) {
      alert("Please provide a symbol and name for the custom currency pair");
      return;
    }
    
    const customId = `custom_${Date.now()}`;
    const newPair: CustomCurrencyPair = {
      ...newCurrency,
      defaultStrike: newCurrency.spot * 1.05,
    };
    
    setCustomPairs({
      ...customPairs,
      [customId]: newPair
    });
    
    setNewCurrency({
      name: "",
      symbol: "",
      spot: 1.0,
      vol: 10,
    });
    setShowCurrencyModal(false);
    
    setSelectedPair(customId);
    
    setParams((prev) => ({
      ...prev,
      spot: newPair.spot,
      strikeUpper: newPair.defaultStrike,
      strikeLower: newPair.defaultStrike * 0.95,
      strikeMid: newPair.spot,
      barrierUpper: newPair.defaultStrike * 1.05,
      barrierLower: newPair.defaultStrike * 0.9,
      vol: newPair.vol / 100,
    }));
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
      
      const minSpot = params.spot * 0.7;
      const maxSpot = params.spot * 1.3;
      const numSteps = 100;
      const step = (maxSpot - minSpot) / numSteps;
      
      let bestCase = -Infinity;
      let worstCase = Infinity;
      let bestCaseSpot = params.spot;
      let worstCaseSpot = params.spot;
      
      for (const point of payoffData) {
        const hedgedRate = point['Hedged Rate'];
        const unhedgedRate = point['Unhedged Rate'];
        
        const payoff = hedgedRate - unhedgedRate;
        
        if (payoff > bestCase) {
          bestCase = payoff;
          bestCaseSpot = point.spot;
        }
        
        if (payoff < worstCase) {
          worstCase = payoff;
          worstCaseSpot = point.spot;
        }
      }
      
      const riskRewardRatio = worstCase !== 0 ? Math.abs(bestCase / worstCase) : Infinity;
      
      setRiskReward({
        bestCase: bestCase,
        worstCase: worstCase,
        bestCaseSpot: bestCaseSpot,
        worstCaseSpot: worstCaseSpot,
        riskRewardRatio: riskRewardRatio
      });
      
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

  const CurrencyPairModal = () => (
    showCurrencyModal && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-background rounded-lg shadow-lg max-w-md w-full p-6">
          <h3 className="font-bold text-xl mb-4">Add Custom Currency Pair</h3>
          
          <div className="grid gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Symbol (e.g. EUR/USD)
                <input
                  type="text"
                  value={newCurrency.symbol}
                  onChange={(e) => setNewCurrency({...newCurrency, symbol: e.target.value})}
                  className="input-field mt-1 w-full"
                  placeholder="EUR/USD"
                />
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Name
                <input
                  type="text"
                  value={newCurrency.name}
                  onChange={(e) => setNewCurrency({...newCurrency, name: e.target.value})}
                  className="input-field mt-1 w-full"
                  placeholder="Euro / US Dollar"
                />
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Spot Rate
                <input
                  type="number"
                  value={newCurrency.spot}
                  onChange={(e) => setNewCurrency({...newCurrency, spot: parseFloat(e.target.value)})}
                  step="0.01"
                  className="input-field mt-1 w-full"
                />
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Volatility (%)
                <input
                  type="number"
                  value={newCurrency.vol}
                  onChange={(e) => setNewCurrency({...newCurrency, vol: parseFloat(e.target.value)})}
                  step="0.1"
                  className="input-field mt-1 w-full"
                />
              </label>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCurrencyModal(false)}
              className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleAddCustomCurrency}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    )
  );

  return (
    <Section>
      <div className="max-w-6xl mx-auto">
        <Heading level={1} className="font-bold mb-8 text-center">
          Foreign Exchange Hedging Dashboard
        </Heading>
        
        {CurrencyPairModal()}
        
        <GlassContainer className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium">
                Currency Pair
                <div className="flex gap-2">
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
                    
                    {Object.keys(customPairs).length > 0 && (
                      <optgroup label="Custom Pairs">
                        {Object.entries(customPairs).map(([key, pair]) => (
                          <option key={key} value={key}>
                            {pair.symbol} - {pair.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <button
                    onClick={() => setShowCurrencyModal(true)}
                    className="mt-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    title="Add Currency Pair"
                  >
                    <Plus size={20} />
                  </button>
                </div>
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
                    {selectedPair.includes("/") ? selectedPair.split("/")[0] : "Currency 1"} Rate (%)
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
                    {selectedPair.includes("/") ? selectedPair.split("/")[1] : "Currency 2"} Rate (%)
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
            riskReward={riskReward}
          />
        </Grid>

        <PayoffChart
          data={results.payoffData}
          selectedStrategy={selectedStrategy}
          spot={params.spot}
          riskReward={riskReward}
        />
      </div>
    </Section>
  );
};

export default HedgeCalculator;
