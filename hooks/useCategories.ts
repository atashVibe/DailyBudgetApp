import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Category,
  getCategories,
  subscribeCategories,
} from "../services/categories";

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
    setCategories([]);
    if (!familyId || !budgetAreaId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeCategories(
      familyId,
      budgetAreaId,
      (next) => {
        setCategories(next);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading categories:", error);
        setCategories([]);
        setLoading(false);
      },
    );
  }, [familyId, budgetAreaId]);

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
