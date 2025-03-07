
import React, { useState, useEffect } from "react";
import CustomStrategyOption, { OptionComponent } from "./CustomStrategyOption";
import { Plus } from "lucide-react";

interface CustomStrategyBuilderProps {
  spot: number;
  onStrategyChange: (options: OptionComponent[], params: StrategyParams) => void;
}

interface StrategyParams {
  maturity: number;
  r1: number;
  r2: number;
  notional: number;
}

const CustomStrategyBuilder: React.FC<CustomStrategyBuilderProps> = ({ spot, onStrategyChange }) => {
  const [options, setOptions] = useState<OptionComponent[]>([
    {
      type: "call",
      strike: 105,
      strikeType: "percentage",
      volatility: 20,
      quantity: 100,
    },
  ]);
  
  const [params, setParams] = useState<StrategyParams>({
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
    };
    const updatedOptions = [...options, newOption];
    setOptions(updatedOptions);
    onStrategyChange(updatedOptions, params);
  };

  const handleUpdateOption = (index: number, data: Partial<OptionComponent>) => {
    const updatedOptions = [...options];
    updatedOptions[index] = { ...updatedOptions[index], ...data };
    setOptions(updatedOptions);
    onStrategyChange(updatedOptions, params);
  };

  const handleDeleteOption = (index: number) => {
    const updatedOptions = [...options];
    updatedOptions.splice(index, 1);
    setOptions(updatedOptions);
    onStrategyChange(updatedOptions, params);
  };
  
  const handleParamChange = (key: keyof StrategyParams, value: number) => {
    const updatedParams = { ...params, [key]: value };
    setParams(updatedParams);
    onStrategyChange(options, updatedParams);
  };
  
  // Update when initially mounted
  useEffect(() => {
    onStrategyChange(options, params);
  }, []);

  return (
    <div className="mt-6 p-4 bg-background/50 rounded-lg border border-border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-xl">Composants de la Stratégie</h3>
        <button
          onClick={handleAddOption}
          className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus size={18} className="mr-2" /> Ajouter Option
        </button>
      </div>
      
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Échéance (années)
            <input
              type="number"
              value={params.maturity}
              onChange={(e) => handleParamChange('maturity', parseFloat(e.target.value))}
              step="0.25"
              className="mt-1 block w-full rounded-md border border-border bg-background/50 px-3 py-2"
            />
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Taux devise 1 (%)
            <input
              type="number"
              value={params.r1 * 100}
              onChange={(e) => handleParamChange('r1', parseFloat(e.target.value) / 100)}
              step="0.1"
              className="mt-1 block w-full rounded-md border border-border bg-background/50 px-3 py-2"
            />
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Taux devise 2 (%)
            <input
              type="number"
              value={params.r2 * 100}
              onChange={(e) => handleParamChange('r2', parseFloat(e.target.value) / 100)}
              step="0.1"
              className="mt-1 block w-full rounded-md border border-border bg-background/50 px-3 py-2"
            />
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Montant Notionnel
            <input
              type="number"
              value={params.notional}
              onChange={(e) => handleParamChange('notional', parseFloat(e.target.value))}
              step="100000"
              className="mt-1 block w-full rounded-md border border-border bg-background/50 px-3 py-2"
            />
          </label>
        </div>
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
          Aucune option ajoutée. Cliquez sur "Ajouter Option" pour commencer à construire votre stratégie.
        </div>
      )}
    </div>
  );
};

// Re-export the OptionComponent type so it can be imported from this file
export type { OptionComponent };
export default CustomStrategyBuilder;
