"use client";

import React, { useEffect, useState } from "react";
import { useStore } from "@/store";
import { useFirestore } from "@/hooks/useFirestore";
import { useSettings } from "@/hooks/useSettings";
import { FoodLog, FoodItem } from "@/types";
import { FoodProduct } from "@/components/food/FoodConfirmModal";
import { MacroSummary } from "@/components/food/MacroSummary";
import { MealSection } from "@/components/food/MealSection";
import { BarcodeScanner } from "@/components/food/BarcodeScanner";
import { AIFoodEntry } from "@/components/food/AIFoodEntry";
import { FoodConfirmModal } from "@/components/food/FoodConfirmModal";
import { Button } from "@/components/ui/Button";
import { format, addDays, subDays, isToday, parseISO } from "date-fns";
import { where, limit } from "firebase/firestore";

const MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"] as const;

export default function FoodPage() {
  const { user, settings, selectedDate, setSelectedDate } = useStore();
  const { queryDocs, saveDoc } = useFirestore();
  useSettings(); // loads settings from Firestore into the store on mount
  const [todayLog, setTodayLog] = useState<FoodLog | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<FoodProduct | null>(null);

  // ── Load food log for the selected date ────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const loadLog = async () => {
      const logs = await queryDocs<FoodLog>(
        "food_logs",
        where("date", "==", selectedDate),
        limit(1),
      );
      if (logs.length > 0) {
        setTodayLog(logs[0]);
      } else {
        setTodayLog({
          id: selectedDate,
          userId: user.uid,
          date: selectedDate,
          items: [],
        });
      }
    };

    loadLog().catch((err) =>
      console.error("[FoodPage] Failed to load log:", err),
    );
  }, [user, selectedDate, queryDocs]);

  // ── Date navigation ────────────────────────────────────────────────────────
  const goToPrev = () =>
    setSelectedDate(
      format(subDays(parseISO(selectedDate), 1), "yyyy-MM-dd"),
    );
  const goToNext = () => {
    const next = addDays(parseISO(selectedDate), 1);
    // Don't allow navigating past today
    if (next <= new Date()) {
      setSelectedDate(format(next, "yyyy-MM-dd"));
    }
  };
  const goToToday = () =>
    setSelectedDate(format(new Date(), "yyyy-MM-dd"));

  const isSelectedToday = isToday(parseISO(selectedDate));

  // ── Food operations ────────────────────────────────────────────────────────
  const handleAddFood = async (item: FoodItem, meal: string) => {
    if (!todayLog || !user) return;
    const newItem = { ...item, meal };
    const updatedLog = { ...todayLog, items: [...todayLog.items, newItem] };
    setTodayLog(updatedLog);
    try {
      await saveDoc("food_logs", todayLog.id, updatedLog);
    } catch (err) {
      console.error("[FoodPage] Failed to save food item:", err);
      setTodayLog(todayLog); // rollback optimistic update
    }
  };

  const handleDeleteFood = async (itemId: string) => {
    if (!todayLog) return;
    const previousLog = todayLog;
    const updatedLog = {
      ...todayLog,
      items: todayLog.items.filter((i) => i.id !== itemId),
    };
    setTodayLog(updatedLog);
    try {
      await saveDoc("food_logs", todayLog.id, updatedLog);
    } catch (err) {
      console.error("[FoodPage] Failed to delete food item:", err);
      setTodayLog(previousLog); // rollback optimistic update
    }
  };

  // ── Macro totals ───────────────────────────────────────────────────────────
  const totals = (todayLog?.items ?? []).reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
      fiber: acc.fiber + item.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

  const dateLabel = isSelectedToday
    ? "Today"
    : format(parseISO(selectedDate), "EEE, MMM d");

  return (
    <div className="flex flex-col h-full space-y-4 max-w-2xl mx-auto w-full pb-20 overflow-y-auto custom-scrollbar px-4 pt-12">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-nous-secondary">
            Nutrition
          </p>
          <h1
            className="text-[32px] font-bold text-nous-primary mt-0.5"
            style={{ fontStyle: "italic", letterSpacing: "-0.03em", lineHeight: 1.1 }}
          >
            Food
          </h1>
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-1 mb-1">
          <button
            onClick={goToPrev}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-nous-secondary hover:text-nous-primary"
            style={{ background: "var(--nous-surface)", border: "1px solid var(--nous-border)" }}
            title="Previous day"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <button
            onClick={goToToday}
            className="h-8 px-3 rounded-lg text-[11px] font-semibold transition-all"
            style={{
              background: isSelectedToday ? "rgba(124,122,255,0.12)" : "var(--nous-surface)",
              border: `1px solid ${isSelectedToday ? "rgba(124,122,255,0.3)" : "var(--nous-border)"}`,
              color: isSelectedToday ? "var(--nous-accent)" : "var(--nous-secondary)",
            }}
          >
            {dateLabel}
          </button>

          <button
            onClick={goToNext}
            disabled={isSelectedToday}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-nous-secondary hover:text-nous-primary disabled:opacity-30"
            style={{ background: "var(--nous-surface)", border: "1px solid var(--nous-border)" }}
            title="Next day"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      <MacroSummary totals={totals} goals={settings} />

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="secondary"
          onClick={() => setIsScannerOpen(true)}
          className="flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
          Scan Barcode
        </Button>
        <div />
      </div>

      <AIFoodEntry
        onResult={setConfirmModalData}
        geminiApiKey={settings.geminiApiKey}
      />

      {/* Meal sections */}
      <div className="space-y-4">
        {MEALS.map((meal) => (
          <MealSection
            key={meal}
            mealName={meal}
            items={
              todayLog?.items.filter(
                (i) => i.meal?.toLowerCase() === meal.toLowerCase(),
              ) ?? []
            }
            onDelete={handleDeleteFood}
          />
        ))}
      </div>

      {/* Barcode scanner overlay */}
      {isScannerOpen && (
        <BarcodeScanner
          onResult={(data) => {
            setConfirmModalData(data as FoodProduct);
            setIsScannerOpen(false);
          }}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

      {/* Food confirm modal */}
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
