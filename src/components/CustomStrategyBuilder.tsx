
import React, { useState, useEffect } from "react";
import CustomStrategyOption, { OptionComponent } from "./CustomStrategyOption";
import { Plus } from "lucide-react";
import { GlassContainer } from "@/components/ui/layout";
import { 
  calculateOptionPremium,
  calculateCustomStrategyPayoff
} from "@/utils/barrierOptionCalculations";

interface CustomStrategyBuilderProps {
  spot: number;
  onStrategyChange: (options: OptionComponent[], globalParams: any) => void;
  includePremium: boolean;
}

const CustomStrategyBuilder: React.FC<CustomStrategyBuilderProps> = ({ 
  spot, 
  onStrategyChange,
  includePremium 
}) => {
  const [options, setOptions] = useState<OptionComponent[]>([
    {
      type: "call",
      strike: 105,
      strikeType: "percentage",
      volatility: 20,
      quantity: 100,
      bidSpread: 0,
      askSpread: 0,
    },
  ]);
  const [globalParams, setGlobalParams] = useState({
    maturity: 1,
    r1: 0.02,
    r2: 0.03,
    notional: 1000000,
  });

  const handleAddOption = () => {
    const newOption: OptionComponent = {
      type: "put",
      strike: 95,
      strikeType: "percentage",
      volatility: 20,
      quantity: 100,
      bidSpread: 0,
      askSpread: 0,
    };
    const updatedOptions = [...options, newOption];
    setOptions(updatedOptions);
    updateOptionsWithPremiums(updatedOptions);
  };

  const handleUpdateOption = (index: number, data: Partial<OptionComponent>) => {
    const updatedOptions = [...options];
    updatedOptions[index] = { ...updatedOptions[index], ...data };
    setOptions(updatedOptions);
    updateOptionsWithPremiums(updatedOptions);
  };

  const handleDeleteOption = (index: number) => {
    const updatedOptions = [...options];
    updatedOptions.splice(index, 1);
    setOptions(updatedOptions);
    updateOptionsWithPremiums(updatedOptions);
  };

  const handleGlobalParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const parsedValue = name === 'notional' ? parseInt(value) : parseFloat(value);
    const updatedParams = {
      ...globalParams,
      [name]: parsedValue
    };
    setGlobalParams(updatedParams);
    updateOptionsWithPremiums(options, updatedParams);
  };

  const updateOptionsWithPremiums = (currentOptions: OptionComponent[], params = globalParams) => {
    // Calculate real strikes and premiums for all options
    const optionsWithPremiums = currentOptions.map(option => {
      const actualStrike = option.strikeType === "percentage" 
        ? spot * (option.strike / 100) 
        : option.strike;
        
      const actualUpperBarrier = option.upperBarrier 
        ? (option.upperBarrierType === "percentage" 
            ? spot * (option.upperBarrier / 100) 
            : option.upperBarrier)
        : undefined;
        
      const actualLowerBarrier = option.lowerBarrier 
        ? (option.lowerBarrierType === "percentage" 
            ? spot * (option.lowerBarrier / 100) 
            : option.lowerBarrier)
        : undefined;
      
      // Use the existing calculation function
      const premium = calculateOptionPremium(
        { ...option, actualStrike, actualUpperBarrier, actualLowerBarrier },
        spot, 
        params
      );
      
      return { 
        ...option, 
        premium,
        actualStrike,
        actualUpperBarrier,
        actualLowerBarrier
      };
    });
    
    // Generate payoff data
    const minSpot = spot * 0.7;
    const maxSpot = spot * 1.3;
    const numSteps = 100;
    const step = (maxSpot - minSpot) / numSteps;
    
    const payoffData = [];
    
    for (let currentSpot = minSpot; currentSpot <= maxSpot; currentSpot += step) {
      // Calculate the PnL from the strategy
      const pnl = calculateCustomStrategyPayoff(
        optionsWithPremiums, 
        currentSpot, 
        spot, 
        params,
        includePremium
      );
      
      // Add PnL to the unhedged rate (which is the spot itself) to get the hedged rate
      const hedgedRate = currentSpot + pnl;
      
      const dataPoint = {
        spot: parseFloat(currentSpot.toFixed(4)),
        'Unhedged Rate': parseFloat(currentSpot.toFixed(4)),
        'Initial Spot': parseFloat(spot.toFixed(4)),
        'Hedged Rate': parseFloat(hedgedRate.toFixed(4))
      };
      
      // Add reference lines for strike and barriers for the first data point only
      if (payoffData.length === 0) {
        optionsWithPremiums.forEach((option, index) => {
          if (option.actualStrike) {
            dataPoint[`Option ${index + 1} Strike`] = parseFloat(option.actualStrike.toFixed(4));
          }
          if (option.actualUpperBarrier) {
            dataPoint[`Option ${index + 1} Upper Barrier`] = parseFloat(option.actualUpperBarrier.toFixed(4));
          }
          if (option.actualLowerBarrier) {
            dataPoint[`Option ${index + 1} Lower Barrier`] = parseFloat(option.actualLowerBarrier.toFixed(4));
          }
        });
      }
      
      payoffData.push(dataPoint);
    }
    
    onStrategyChange(optionsWithPremiums, params);
  };

  useEffect(() => {
    updateOptionsWithPremiums(options);
  }, [spot, includePremium]); // Update when spot or includePremium changes

  useEffect(() => {
    updateOptionsWithPremiums(options);
  }, []); // Initial calculation

  return (
    <>
      <GlassContainer className="mb-8">
        <h3 className="font-bold text-xl mb-4">Global Parameters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Maturity (years)
              <input
                type="number"
                name="maturity"
                value={globalParams.maturity}
                onChange={handleGlobalParamChange}
                step="0.25"
                className="input-field mt-1 w-full"
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Currency 1 Rate (%)
              <input
                type="number"
                name="r1"
                value={globalParams.r1 * 100}
                onChange={(e) => {
                  const updatedParams = {
                    ...globalParams,
                    r1: parseFloat(e.target.value) / 100
                  };
                  setGlobalParams(updatedParams);
                  updateOptionsWithPremiums(options, updatedParams);
                }}
                step="0.1"
                className="input-field mt-1 w-full"
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Currency 2 Rate (%)
              <input
                type="number"
                name="r2"
                value={globalParams.r2 * 100}
                onChange={(e) => {
                  const updatedParams = {
                    ...globalParams,
                    r2: parseFloat(e.target.value) / 100
                  };
                  setGlobalParams(updatedParams);
                  updateOptionsWithPremiums(options, updatedParams);
                }}
                step="0.1"
                className="input-field mt-1 w-full"
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Notional Amount
              <input
                type="number"
                name="notional"
                value={globalParams.notional}
                onChange={handleGlobalParamChange}
                step="100000"
                className="input-field mt-1 w-full"
              />
            </label>
          </div>
        </div>
      </GlassContainer>

      <div className="mt-6 p-4 bg-background/50 rounded-lg border border-border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-xl">Strategy Components</h3>
          <button
            onClick={handleAddOption}
            className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus size={18} className="mr-2" /> Add Option
          </button>
        </div>

        {options.map((option, index) => (
          <CustomStrategyOption
            key={index}
            index={index}
            optionData={option}
            spot={spot}
            onUpdate={handleUpdateOption}
            onDelete={handleDeleteOption}
          />
        ))}

        {options.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            No options added. Click "Add Option" to start building your strategy.
          </div>
        )}
      </div>
    </>
  );
};

export default CustomStrategyBuilder;
