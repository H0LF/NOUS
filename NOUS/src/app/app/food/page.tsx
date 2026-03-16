"use client";

import React, { useEffect, useState } from "react";
import { useStore } from "@/store";
import { useFirestore } from "@/hooks/useFirestore";
import { useSettings } from "@/hooks/useSettings";
import { FoodLog, FoodItem } from "@/types";
import { MacroSummary } from "@/components/food/MacroSummary";
import { MealSection } from "@/components/food/MealSection";
import { BarcodeScanner } from "@/components/food/BarcodeScanner";
import { AIFoodEntry } from "@/components/food/AIFoodEntry";
import { FoodConfirmModal } from "@/components/food/FoodConfirmModal";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import { where, limit } from "firebase/firestore";

export default function FoodPage() {
  const { user, userSettings } = useStore();
  const { queryDocs, saveDoc, deleteDocument } = useFirestore();
  const { settings } = useSettings(); // Ensure settings are loaded
  const [todayLog, setTodayLog] = useState<FoodLog | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<any>(null);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!user) return;
    const loadLog = async () => {
        // Query logs for today
        const logs = await queryDocs<FoodLog>("food_logs", where("date", "==", todayStr), limit(1));
        if (logs.length > 0) {
            setTodayLog(logs[0]);
        } else {
            setTodayLog({
                id: todayStr, // Simple ID for today
                userId: user.uid,
                date: todayStr,
                items: []
            });
        }
    };
    loadLog();
  }, [user, todayStr, queryDocs]);

  const handleAddFood = async (item: FoodItem, meal: string) => {
      if (!todayLog || !user) return;
      
      const newItem = { ...item, meal }; // Ensure meal is set
      const newItems = [...todayLog.items, newItem];
      
      const updatedLog = {
          ...todayLog,
          items: newItems
      };
      
      setTodayLog(updatedLog);
      await saveDoc("food_logs", todayLog.id, updatedLog);
  };

  const handleDeleteFood = async (itemId: string) => {
      if (!todayLog) return;
      const newItems = todayLog.items.filter(i => i.id !== itemId);
      const updatedLog = { ...todayLog, items: newItems };
      setTodayLog(updatedLog);
      await saveDoc("food_logs", todayLog.id, updatedLog);
  };

  const totals = todayLog ? todayLog.items.reduce((acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
      fiber: acc.fiber + item.fiber
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }) : { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

  const meals = ["Breakfast", "Lunch", "Dinner", "Snacks"];

  return (
    <div className="flex flex-col h-full space-y-4 max-w-2xl mx-auto w-full pb-20 overflow-y-auto custom-scrollbar px-4 pt-12">
         <div className="flex items-end justify-between">
             <div>
               <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-nous-secondary">Today</p>
               <h1 className="text-[32px] font-bold text-nous-primary mt-0.5" style={{ fontStyle: 'italic', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                 Nutrition
               </h1>
             </div>
             <div className="text-[11px] font-medium text-nous-secondary mb-1">
                 {format(new Date(), "EEE, MMM d")}
             </div>
         </div>

         <MacroSummary totals={totals} goals={userSettings || settings} />

         <div className="grid grid-cols-2 gap-3">
             <Button 
                variant="secondary" 
                onClick={() => setIsScannerOpen(true)}
                className="flex items-center justify-center gap-2"
             >
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                 Scan Barcode
             </Button>
             
             {/* AI Entry is handled below inline or via button? Design choice by me: Always visible or collapsible. Let's make it usually visible. */}
         </div>
         
         <AIFoodEntry 
             onResult={setConfirmModalData} 
             geminiApiKey={settings.geminiApiKey} 
         />

         <div className="space-y-4">
             {meals.map(meal => (
                 <MealSection 
                    key={meal} 
                    mealName={meal} 
                    items={todayLog?.items.filter(i => i.meal?.toLowerCase() === meal.toLowerCase()) || []} 
                    onDelete={handleDeleteFood}
                 />
             ))}
         </div>

         {isScannerOpen && (
             <BarcodeScanner 
                onResult={(data) => {
                    setConfirmModalData(data);
                    setIsScannerOpen(false);
                }} 
                onClose={() => setIsScannerOpen(false)} 
             />
         )}

         {confirmModalData && (
             <FoodConfirmModal 
                isOpen={!!confirmModalData} 
                onClose={() => setConfirmModalData(null)} 
                product={confirmModalData} 
                onConfirm={handleAddFood} 
             />
         )}
    </div>
  );
}
