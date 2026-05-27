export type EntryType = "expense" | "income" | "refund" | "cashback";

export interface BudgetArea {
  id: string;

  name: string;

  familyId: string | null;

  isDefault: boolean;

  isArchived: boolean;

  createdBy: string;

  createdAt: any;
}

export interface Category {
  id: string;

  name: string;

  budgetAreaId: string;

  familyId: string | null;

  isDefault: boolean;

  isArchived: boolean;

  createdBy: string;

  createdAt: any;
}

export interface Entry {
  id: string;

  familyId: string;

  userId: string;

  budgetAreaId: string;

  categoryId: string;

  type: EntryType;

  amount: number;
}
