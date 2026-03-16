import React from "react";
import { FoodItem } from "@/types";

interface MealSectionProps {
  mealName: string;
  items: FoodItem[];
  onDelete: (id: string) => void;
}

export const MealSection = ({ mealName, items, onDelete }: MealSectionProps) => {
  const totalCals = items.reduce((acc, item) => acc + item.calories, 0);

  return (
    <div className="bg-nous-surface/20 rounded-xl overflow-hidden border border-transparent hover:border-nous-border/50 transition-colors">
        <div className="px-4 py-2 bg-nous-surface/50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-nous-primary uppercase tracking-wider">{mealName}</h3>
            <span className="text-xs text-nous-secondary font-medium">{Math.round(totalCals)} kcal</span>
        </div>
        
        <div className="divide-y divide-nous-border/30">
            {items.map(item => (
                <div key={item.id} className="p-3 flex justify-between items-start group hover:bg-nous-surface/30 transition-colors">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                             <div className="font-medium text-sm text-nous-primary">{item.name}</div>
                             {item.source === "ai" && (
                                 <span className="text-[10px] bg-purple-500/10 text-purple-500 px-1.5 rounded border border-purple-500/20">AI</span>
                             )}
                             {item.source === "barcode" && (
                                 <span className="text-[10px] bg-blue-500/10 text-blue-500 px-1.5 rounded border border-blue-500/20">Scan</span>
                             )}
                        </div>
                        <div className="text-xs text-nous-secondary mt-0.5">
                            {item.quantity}g • <span className="text-nous-accent">{Math.round(item.calories)} kcal</span>
                        </div>
                        <div className="text-[10px] text-nous-secondary/70 mt-0.5 flex gap-2">
                            <span>P: {Math.round(item.protein)}g</span>
                            <span>C: {Math.round(item.carbs)}g</span>
                            <span>F: {Math.round(item.fat)}g</span>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => onDelete(item.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-nous-secondary hover:text-red-500 transition-all"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            ))}
            {items.length === 0 && (
                <div className="p-3 text-xs text-nous-secondary text-center italic">
                    No food logged for {mealName}
                </div>
            )}
        </div>
    </div>
  );
};
