import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface IngredientInputProps {
  ingredients: string[];
  onChange: (ingredients: string[]) => void;
  label?: string;
}

const IngredientInput: React.FC<IngredientInputProps> = ({ ingredients, onChange, label = "What's in your fridge?" }) => {
  const [input, setInput] = useState('');

  const addIngredient = () => {
    if (input.trim() && !ingredients.includes(input.trim())) {
      onChange([...ingredients, input.trim()]);
      setInput('');
    }
  };

  const removeIngredient = (ing: string) => {
    onChange(ingredients.filter(i => i !== ing));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addIngredient();
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-semibold text-stone-700 mb-2">{label}</label>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Eggs, Tomato"
          className="flex-1 px-4 py-2 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-200 text-stone-800 placeholder-stone-400"
        />
        <button 
          onClick={addIngredient}
          disabled={!input.trim()}
          className="bg-orange-500 text-white p-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          <Plus size={24} />
        </button>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {ingredients.map(ing => (
          <span key={ing} className="inline-flex items-center px-3 py-1 bg-white border border-orange-100 rounded-full text-sm text-stone-600 shadow-sm animate-in fade-in zoom-in duration-200">
            {ing}
            <button onClick={() => removeIngredient(ing)} className="ml-2 text-stone-400 hover:text-red-500">
              <X size={14} />
            </button>
          </span>
        ))}
        {ingredients.length === 0 && (
          <span className="text-xs text-stone-400 italic px-1">No ingredients added yet.</span>
        )}
      </div>
    </div>
  );
};

export default IngredientInput;