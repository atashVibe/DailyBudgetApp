import { useCallback, useEffect, useMemo, useState } from "react";

import { Category, getCategories } from "../services/categories";

export function useCategories(familyId: string, budgetAreaId: string) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    if (!familyId || !budgetAreaId) {
      setCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const loadedCategories = await getCategories(familyId, budgetAreaId);
      setCategories(loadedCategories);
    } catch (error) {
      console.error("Error loading categories:", error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [familyId, budgetAreaId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const defaultCategory = useMemo(() => {
    return categories.find((category) => category.isDefault === true) ?? null;
  }, [categories]);

  return {
    categories,
    defaultCategory,
    loading,
    refreshCategories: loadCategories,
  };
}
