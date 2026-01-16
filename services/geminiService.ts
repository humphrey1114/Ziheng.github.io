import { GoogleGenAI, Type } from "@google/genai";
import { Recipe } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using a lightweight schema to ensure we get usable recipe data
const recipeSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    cookTime: { type: Type.NUMBER },
    calories: { type: Type.NUMBER },
    cuisine: { type: Type.STRING },
    difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] },
    ingredients: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          amount: { type: Type.STRING },
          category: { type: Type.STRING, enum: ['vegetable', 'meat', 'seafood', 'dairy', 'pantry', 'fruit', 'grain'] },
        }
      }
    },
    steps: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    tips: { type: Type.STRING }
  },
  required: ['title', 'ingredients', 'steps']
};

export const generateAiRecipe = async (
  ingredients: string[], 
  tastes: string[],
  otherRequest?: string
): Promise<Recipe> => {
  try {
    const prompt = `Create a unique, delicious recipe using these ingredients: ${ingredients.join(', ')}. 
    Preferred tastes: ${tastes.join(', ')}. 
    Additional user request: ${otherRequest || 'none'}.
    Return a structured JSON recipe.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: recipeSchema,
        thinkingConfig: { thinkingBudget: 0 } // Speed over deep thought for recipes
      }
    });

    const data = JSON.parse(response.text || '{}');
    
    // Transform into our internal Recipe type
    return {
      ...data,
      id: `ai_${Date.now()}`,
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80', // Default AI food image
      tags: tastes,
      isAiGenerated: true
    } as Recipe;

  } catch (error) {
    console.error("Gemini Recipe Generation Error:", error);
    throw new Error("Failed to generate recipe. Please try again.");
  }
};