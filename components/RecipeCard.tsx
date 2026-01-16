import React from 'react';
import { Recipe } from '../types';
import { Clock, Flame, ChefHat, Sparkles } from 'lucide-react';

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
  variant?: 'compact' | 'full';
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onClick, variant = 'full' }) => {
  if (variant === 'compact') {
    return (
      <div 
        onClick={onClick}
        className="flex gap-4 p-3 bg-white rounded-xl shadow-sm border border-stone-100 active:scale-95 transition-transform cursor-pointer"
      >
        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
          <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col justify-center">
          <h4 className="font-serif font-bold text-stone-800 line-clamp-1">{recipe.title}</h4>
          <div className="flex items-center text-xs text-stone-500 mt-1 gap-2">
            <span className="flex items-center"><Clock size={12} className="mr-1"/> {recipe.cookTime}m</span>
            <span className="flex items-center"><Flame size={12} className="mr-1"/> {recipe.calories}kcal</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-stone-100 cursor-pointer"
    >
      <div className="relative h-48 overflow-hidden">
        <img 
          src={recipe.image} 
          alt={recipe.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
        />
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-semibold text-stone-700 shadow-sm">
          {recipe.cuisine}
        </div>
        {recipe.isAiGenerated && (
          <div className="absolute top-3 left-3 bg-indigo-500/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-semibold text-white shadow-sm flex items-center">
            <Sparkles size={12} className="mr-1"/> AI Chef
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-serif font-bold text-stone-800 mb-1 leading-snug">{recipe.title}</h3>
        <p className="text-sm text-stone-500 line-clamp-2 mb-3">{recipe.description}</p>
        
        <div className="flex items-center justify-between text-xs text-stone-400 border-t border-stone-50 pt-3">
          <div className="flex gap-3">
            <span className="flex items-center"><Clock size={14} className="mr-1"/> {recipe.cookTime} min</span>
            <span className="flex items-center"><Flame size={14} className="mr-1"/> {recipe.calories} kcal</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full ${
            recipe.difficulty === 'Easy' ? 'bg-green-100 text-green-700' : 
            recipe.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 
            'bg-red-100 text-red-700'
          }`}>
            {recipe.difficulty}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;