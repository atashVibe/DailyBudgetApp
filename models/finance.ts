export type EntryKind =
  | "expense"
  | "income"
  | "refund"
  | "cashback"
  | "transfer";

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

  entryKind: EntryKind;

  amount: number;

  note: string;

  date: any;

  createdAt: any;
}
