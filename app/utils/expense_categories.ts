import type { ExpenseCategory } from '#models/expense_record'

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  feed: 'Feed',
  medication: 'Medication',
  labour: 'Labour',
  transport: 'Transport',
  utilities: 'Utilities',
  equipment: 'Equipment',
  housing: 'Housing',
  packaging: 'Packaging',
  marketing: 'Marketing',
  other: 'Other',
}

export function formatExpenseType(
  category: ExpenseCategory,
  customType: string | null | undefined,
): string {
  if (category === 'other') return customType?.trim() || 'Other'
  return EXPENSE_CATEGORY_LABELS[category]
}
