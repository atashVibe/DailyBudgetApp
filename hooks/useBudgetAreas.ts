import { useCallback, useEffect, useState } from "react";

import { getBudgetAreas, type BudgetArea } from "../services/budgetAreas";

export function useBudgetAreas(familyId: string) {
  const [budgetAreas, setBudgetAreas] = useState<BudgetArea[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBudgetAreas = useCallback(async () => {
    if (!familyId) {
      setBudgetAreas([]);
      return;
    }

    setLoading(true);

    try {
      const loadedBudgetAreas = await getBudgetAreas(familyId);

      setBudgetAreas(loadedBudgetAreas);
    } catch (error) {
      console.error("Error loading budget areas:", error);
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    loadBudgetAreas();
  }, [loadBudgetAreas]);

  return {
    budgetAreas,
    setBudgetAreas,
    loading,
    refreshBudgetAreas: loadBudgetAreas,
  };
}
