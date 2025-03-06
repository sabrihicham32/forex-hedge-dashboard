
import React, { useState, useEffect } from "react";
import { 
  calculateStrategyResults, 
  calculatePayoff 
} from "@/utils/hedgeCalculations";
import { FOREX_PAIRS, STRATEGIES, FOREX_PAIR_CATEGORIES } from "@/utils/forexData";
import PayoffChart from "./PayoffChart";
import StrategyInfo from "./StrategyInfo";
import { Section, GlassContainer, Grid, Heading } from "@/components/ui/layout";

const HedgeCalculator = () => {
  const [selectedPair, setSelectedPair] = useState("EUR/USD");
  const [selectedStrategy, setSelectedStrategy] = useState("collar");
  const [results, setResults] = useState<any>(null);
  const [params, setParams] = useState({
    spot: FOREX_PAIRS["EUR/USD"].spot,
    strikeUpper: FOREX_PAIRS["EUR/USD"].defaultStrike,
    strikeLower: FOREX_PAIRS["EUR/USD"].defaultStrike * 0.95,
    strikeMid: FOREX_PAIRS["EUR/USD"].spot, // For strategies like seagull
    barrierUpper: FOREX_PAIRS["EUR/USD"].defaultStrike * 1.05, // For KO barriers
    barrierLower: FOREX_PAIRS["EUR/USD"].defaultStrike * 0.9, // For KI barriers
    maturity: 1,
    r1: 0.02, // Rate for currency 1
    r2: 0.03, // Rate for currency 2
    vol: FOREX_PAIRS["EUR/USD"].vol,
    premium: 0, // For non-zero cost strategies
    notional: 1000000, // Nominal amount to hedge
  });

  // Handle forex pair change
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

  // Handle strategy change
  const handleStrategyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStrategy = e.target.value;
    setSelectedStrategy(newStrategy);

    // Reset certain parameters based on strategy
    if (newStrategy === "seagull" && !params.strikeMid) {
      setParams((prev) => ({ ...prev, strikeMid: params.spot }));
    }
  };

  // Calculate results when parameters change
  useEffect(() => {
    if (!selectedStrategy) return;
    
    const calculatedResults = calculateStrategyResults(selectedStrategy, params);
    
    if (calculatedResults) {
      const payoffData = calculatePayoff(calculatedResults, selectedStrategy, params);
      setResults({
        ...calculatedResults,
        payoffData,
      });
    }
  }, [params, selectedStrategy]);

  // Loading state
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

              {/* Strategy-specific inputs */}
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

              {/* Barrier inputs for KO/KI strategies */}
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
        </GlassContainer>

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
