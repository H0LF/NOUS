import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";

interface AIFoodEntryProps {
  onResult: (data: any) => void;
}

export const AIFoodEntry = ({ onResult }: AIFoodEntryProps) => {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/ai/food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to analyze food");
      const mapped = {
        name: data.name,
        calories: data.calories,
        protein: data.protein_g,
        carbs: data.carbs_g,
        fat: data.fat_g,
        fiber: data.fiber_g,
        source: "ai",
        quantity: 100, // Default quantity to normalize
      };

      onResult(mapped);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error analyzing food");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-nous-surface/30 border border-nous-border rounded-xl p-4 animate-slideUp">
      <h3 className="font-semibold text-lg mb-3 text-nous-primary flex items-center gap-2">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--nous-accent)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
        </svg>
        AI Food Analysis
      </h3>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. 2 slices of pepperoni pizza"
          className="flex-1"
          autoFocus
        />
        <Button type="submit" loading={loading}>
          Analyze
        </Button>
      </form>
    </div>
  );
};
