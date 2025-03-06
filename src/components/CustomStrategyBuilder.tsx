
import React, { useState } from "react";
import CustomStrategyOption, { OptionComponent } from "./CustomStrategyOption";
import { Plus } from "lucide-react";

interface CustomStrategyBuilderProps {
  spot: number;
  onStrategyChange: (options: OptionComponent[]) => void;
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
    onStrategyChange(updatedOptions);
  };

  const handleUpdateOption = (index: number, data: Partial<OptionComponent>) => {
    const updatedOptions = [...options];
    updatedOptions[index] = { ...updatedOptions[index], ...data };
    setOptions(updatedOptions);
    onStrategyChange(updatedOptions);
  };

  const handleDeleteOption = (index: number) => {
    const updatedOptions = [...options];
    updatedOptions.splice(index, 1);
    setOptions(updatedOptions);
    onStrategyChange(updatedOptions);
  };

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

export default CustomStrategyBuilder;
