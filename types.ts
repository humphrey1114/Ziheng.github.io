export interface AshRecord {
  id: number;
  content: string;
  timestamp: number;
}

export type AppMode = 'input' | 'igniting' | 'burning' | 'finished' | 'history';

export interface SoundActions {
  strike: () => void;
  ignite: () => void;
  burnLoop: (playing: boolean) => void;
}

export interface Ingredient {
  name: string;
  amount: string;
  category?: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  cookTime: number;
  calories: number;
  cuisine: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | string;
  ingredients: Ingredient[];
  steps: string[];
  tips?: string;
  image: string;
  tags?: string[];
  isAiGenerated?: boolean;
}