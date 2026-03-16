import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FoodItem } from "@/types";
import { v4 as uuidv4 } from "uuid";

interface FoodConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any; // Raw data from API
  onConfirm: (item: FoodItem, meal: string) => void;
}

export const FoodConfirmModal = ({
  isOpen,
  onClose,
  product,
  onConfirm,
}: FoodConfirmModalProps) => {
  const [quantity, setQuantity] = useState("100");
  const [meal, setMeal] = useState("Breakfast");
  const [macros, setMacros] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
  });

  useEffect(() => {
    if (product) {
      // Product data usually comes normalized per 100g from barcode,
      // OR as estimated total serving from AI.
      // If AI, it might report a specific serving size, but we normalized structure in AIFoodEntry to just values.
      // Let's assume input 'product' has values per 100g if barcode, OR absolute values for AI result.
      // If AI result, we default quantity to 100 representing "1 serving" effectively?
      // Or if inputs are per 100g.

      // Barcode inputs: caloriesPer100g, etc.
      // AI inputs: calories, protein, etc (absolute).

      // We need to standardize.
      // Barcode route returns *Per100g.
      // AI route returns absolute values for the description.

      calculateMacros(100);
    }
  }, [product]);

  const calculateMacros = (qty: number) => {
    if (!product) return;

    const ratio = qty / 100;

    if (product.source === "barcode") {
      setMacros({
        calories: (product.caloriesPer100g || 0) * ratio,
        protein: (product.proteinPer100g || 0) * ratio,
        carbs: (product.carbsPer100g || 0) * ratio,
        fat: (product.fatPer100g || 0) * ratio,
        fiber: (product.fiberPer100g || 0) * ratio,
      });
    } else {
      // AI source: values are for the predicted serving.
      // But user might want to adjust quantity percentage-wise.
      // Let's assume standard input was "1 serving" = 100 units (arbitrary).
      // If user changes to 150, it scales.
      // However, better UI for AI results is just "Quantity: [ 1 ] serving".
      // Spec says "Quantity input number default 100, on change recalculate all macros proportionally."
      // So we treat AI result as "100g" equivalent or just base 100.
      setMacros({
        calories: (product.calories || 0) * ratio,
        protein: (product.protein || 0) * ratio,
        carbs: (product.carbs || 0) * ratio,
        fat: (product.fat || 0) * ratio,
        fiber: (product.fiber || 0) * ratio,
      });
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuantity(e.target.value);
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      calculateMacros(val);
    }
  };

  const handleConfirm = () => {
    if (!product) return;
    const qty = parseFloat(quantity) || 100;

    const item: FoodItem = {
      id: uuidv4(),
      name: product.name,
      source: product.source,
      quantity: qty,
      ...macros,
    };

    onConfirm(item, meal.toLowerCase());
    onClose();
  };

  if (!product) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Food">
      <div className="space-y-4">
        <div className="bg-nous-surface/30 p-3 rounded-xl border border-nous-border">
          <h3 className="font-bold text-lg text-nous-primary mb-1">
            {product.name}
          </h3>
          <div className="flex gap-4 text-xs">
            <span className="text-orange-400 font-medium">
              {Math.round(macros.calories)} kcal
            </span>
            <span className="text-blue-400 font-medium">
              {Math.round(macros.protein)}g P
            </span>
            <span className="text-yellow-400 font-medium">
              {Math.round(macros.carbs)}g C
            </span>
            <span className="text-green-400 font-medium">
              {Math.round(macros.fat)}g F
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Quantity (g / %)"
            type="number"
            value={quantity}
            onChange={handleQuantityChange}
          />
          <div>
            <label className="block text-sm font-medium text-nous-secondary mb-1.5">
              Meal
            </label>
            <select
              className="w-full px-4 py-2.5 bg-nous-surface border border-nous-border rounded-xl text-nous-primary outline-none focus:border-nous-accent"
              value={meal}
              onChange={(e) => setMeal(e.target.value)}
            >
              <option>Breakfast</option>
              <option>Lunch</option>
              <option>Dinner</option>
              <option>Snacks</option>
            </select>
          </div>
        </div>

        <Button onClick={handleConfirm} className="w-full mt-2">
          Add to Log
        </Button>
      </div>
    </Modal>
  );
};
