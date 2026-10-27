import { Exception } from '@adonisjs/core/exceptions'
import { DateTime } from 'luxon'
import PDFDocument from 'pdfkit'
import ExpenseRecord, { type ExpenseCategory } from '#models/expense_record'
import activityLogService from '#services/activity_log_service'
import { EXPENSE_CATEGORY_LABELS, formatExpenseType } from '#utils/expense_categories'

export type ExpenseRangePreset = '7d' | '30d' | 'custom'

export interface ExpenseRangeOptions {
  range?: ExpenseRangePreset
  from?: string
  to?: string
}

export interface ExpenseCreateInput {
  category: ExpenseCategory
  customType?: string | null
  amount: number
  note?: string | null
  clientEntryId?: string | null
  recordedAt?: string | DateTime | null
}

export interface ExpenseRecordRow {
  id: string
  category: ExpenseCategory
  customType: string | null
  typeLabel: string
  amount: number
  note: string | null
  recordedAt: string
  userId: string
  userName: string | null
}

export interface ExpenseCategoryTotal {
  category: ExpenseCategory
  label: string
  amount: number
  count: number
}

export interface ExpenseSummary {
  totalAmount: number
  count: number
  averageDaily: number | null
  topCategory: { category: ExpenseCategory; label: string; amount: number } | null
  byCategory: ExpenseCategoryTotal[]
  range: { preset: ExpenseRangePreset; from: string; to: string }
}

function toNumber(value: number | string): number {
  return typeof value === 'string' ? Number(value) : value
}

function parseRecordedAt(value?: string | DateTime | null): DateTime {
  if (!value) return DateTime.now()
  if (DateTime.isDateTime(value)) return value
  const parsed = DateTime.fromISO(value)
  if (!parsed.isValid) throw new Exception('Invalid recordedAt', { status: 422 })
  return parsed
}

export function resolveExpenseRange(options: ExpenseRangeOptions): {
  preset: ExpenseRangePreset
  from: DateTime
  to: DateTime
} {
  const to = options.to ? DateTime.fromISO(options.to).endOf('day') : DateTime.now().endOf('day')
  const range = options.range ?? '7d'

  if (range === 'custom' && options.from) {
    return {
      preset: 'custom',
      from: DateTime.fromISO(options.from).startOf('day'),
      to,
    }
  }
  if (range === '30d') {
    return { preset: '30d', from: to.minus({ days: 29 }).startOf('day'), to }
  }
  return { preset: '7d', from: to.minus({ days: 6 }).startOf('day'), to }
}

function serializeRecord(record: ExpenseRecord): ExpenseRecordRow {
  return {
    id: record.id,
    category: record.category,
    customType: record.customType,
    typeLabel: formatExpenseType(record.category, record.customType),
    amount: toNumber(record.amount),
    note: record.note,
    recordedAt: record.recordedAt.toISO()!,
    userId: record.userId,
    userName: record.user?.fullName ?? null,
  }
}

function formatNairaAmount(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export class ExpenseService {
  async create(
    workspaceId: string,
    userId: string,
    payload: ExpenseCreateInput,
  ): Promise<ExpenseRecord> {
    if (typeof payload.amount !== 'number' || Number.isNaN(payload.amount) || payload.amount < 0.01) {
      throw new Exception('Amount must be at least ₦0.01', { status: 422 })
    }

    const customType =
      payload.category === 'other' ? (payload.customType?.trim() || null) : null

    if (payload.category === 'other' && !customType) {
      throw new Exception('Custom type is required when category is Other', { status: 422 })
    }

    if (payload.clientEntryId) {
      const existing = await ExpenseRecord.query()
        .where('workspace_id', workspaceId)
        .where('client_entry_id', payload.clientEntryId)
        .first()
      if (existing) return existing
    }

    const recordedAt = parseRecordedAt(payload.recordedAt)

    const record = await ExpenseRecord.create({
      workspaceId,
      userId,
      category: payload.category,
      customType,
      amount: payload.amount,
      note: payload.note?.trim() || null,
      clientEntryId: payload.clientEntryId ?? null,
      recordedAt,
    })

    await activityLogService.log({
      workspaceId,
      userId,
      action: 'expense.create',
      entity: 'expense',
      entityId: record.id,
      after: {
        category: record.category,
        customType: record.customType,
        amount: toNumber(record.amount),
      },
      quantity: toNumber(record.amount),
      note: record.note,
      recordedAt,
    })

    return record
  }

  async syncEntry(
    workspaceId: string,
    userId: string,
    clientEntryId: string,
    payload: ExpenseCreateInput,
  ): Promise<{ recordId: string; created: boolean }> {
    const existing = await ExpenseRecord.query()
      .where('workspace_id', workspaceId)
      .where('client_entry_id', clientEntryId)
      .first()
    if (existing) {
      return { recordId: existing.id, created: false }
    }
    const record = await this.create(workspaceId, userId, { ...payload, clientEntryId })
    return { recordId: record.id, created: true }
  }

  async listForRange(
    workspaceId: string,
    options: ExpenseRangeOptions,
  ): Promise<ExpenseRecordRow[]> {
    const range = resolveExpenseRange(options)
    const rows = await ExpenseRecord.query()
      .where('workspace_id', workspaceId)
      .where('recorded_at', '>=', range.from.toSQL()!)
      .where('recorded_at', '<=', range.to.toSQL()!)
      .preload('user')
      .orderBy('recorded_at', 'desc')

    return rows.map(serializeRecord)
  }

  async getSummary(workspaceId: string, options: ExpenseRangeOptions): Promise<ExpenseSummary> {
    const range = resolveExpenseRange(options)
    const rows = await this.listForRange(workspaceId, options)

    const byCategoryMap = new Map<ExpenseCategory, ExpenseCategoryTotal>()
    let totalAmount = 0

    for (const row of rows) {
      totalAmount += row.amount
      const existing = byCategoryMap.get(row.category)
      if (existing) {
        existing.amount += row.amount
        existing.count += 1
      } else {
        byCategoryMap.set(row.category, {
          category: row.category,
          label:
            row.category === 'other'
              ? EXPENSE_CATEGORY_LABELS.other
              : EXPENSE_CATEGORY_LABELS[row.category],
          amount: row.amount,
          count: 1,
        })
      }
    }

    const byCategory = [...byCategoryMap.values()].sort((a, b) => b.amount - a.amount)
    const daySpan = Math.max(
      1,
      Math.round(range.to.startOf('day').diff(range.from.startOf('day'), 'days').days) + 1,
    )
    const top = byCategory[0] ?? null

    return {
      totalAmount,
      count: rows.length,
      averageDaily: rows.length > 0 ? totalAmount / daySpan : null,
      topCategory: top
        ? { category: top.category, label: top.label, amount: top.amount }
        : null,
      byCategory,
      range: {
        preset: range.preset,
        from: range.from.toISODate()!,
        to: range.to.toISODate()!,
      },
    }
  }

  async buildCsv(workspaceId: string, options: ExpenseRangeOptions): Promise<string> {
    const rows = await this.listForRange(workspaceId, options)
    const header = ['Date', 'Type', 'Category', 'Amount (NGN)', 'Note', 'Recorded by']
    const lines = [header.join(',')]

    for (const row of rows) {
      lines.push(
        [
          escapeCsv(row.recordedAt),
          escapeCsv(row.typeLabel),
          escapeCsv(EXPENSE_CATEGORY_LABELS[row.category]),
          escapeCsv(row.amount.toFixed(2)),
          escapeCsv(row.note ?? ''),
          escapeCsv(row.userName ?? ''),
        ].join(','),
      )
    }

    const summary = await this.getSummary(workspaceId, options)
    lines.push('')
    lines.push(`Total,,,"${summary.totalAmount.toFixed(2)}",,`)
    lines.push(`Entries,,,${summary.count},,`)

    return `\uFEFF${lines.join('\n')}`
  }

  async buildPdf(
    workspaceId: string,
    workspaceName: string,
    options: ExpenseRangeOptions,
  ): Promise<Buffer> {
    const [rows, summary] = await Promise.all([
      this.listForRange(workspaceId, options),
      this.getSummary(workspaceId, options),
    ])

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' })
      const chunks: Buffer[] = []

      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      doc.fontSize(18).text('Farm Expense Report', { align: 'left' })
      doc.moveDown(0.4)
      doc.fontSize(11).fillColor('#444').text(workspaceName)
      doc
        .fontSize(10)
        .text(`Period: ${summary.range.from} → ${summary.range.to} (${summary.range.preset})`)
      doc.moveDown()

      doc.fillColor('#000').fontSize(12).text(`Total: ${formatNairaAmount(summary.totalAmount)}`)
      doc.fontSize(10).text(`Entries: ${summary.count}`)
      if (summary.averageDaily != null) {
        doc.text(`Average daily: ${formatNairaAmount(summary.averageDaily)}`)
      }
      if (summary.topCategory) {
        doc.text(
          `Top category: ${summary.topCategory.label} (${formatNairaAmount(summary.topCategory.amount)})`,
        )
      }

      doc.moveDown()
      if (summary.byCategory.length > 0) {
        doc.fontSize(12).text('By category')
        doc.moveDown(0.3)
        for (const item of summary.byCategory) {
          doc
            .fontSize(10)
            .text(
              `${item.label}: ${formatNairaAmount(item.amount)} (${item.count} entr${item.count === 1 ? 'y' : 'ies'})`,
            )
        }
        doc.moveDown()
      }

      doc.fontSize(12).text('Expenses')
      doc.moveDown(0.4)

      if (rows.length === 0) {
        doc.fontSize(10).fillColor('#666').text('No expenses in this period.')
      } else {
        const colX = { date: 50, type: 150, amount: 320, by: 420 }
        doc.fontSize(9).fillColor('#666')
        doc.text('Date', colX.date, doc.y, { continued: false })
        const headerY = doc.y - 11
        doc.text('Type', colX.type, headerY)
        doc.text('Amount', colX.amount, headerY)
        doc.text('By', colX.by, headerY)
        doc.moveDown(0.3)
        doc
          .strokeColor('#ccc')
          .moveTo(50, doc.y)
          .lineTo(545, doc.y)
          .stroke()
        doc.moveDown(0.4)

        for (const row of rows) {
          if (doc.y > 750) {
            doc.addPage()
          }
          const y = doc.y
          const dateLabel = DateTime.fromISO(row.recordedAt).toFormat('dd MMM yyyy')
          doc.fillColor('#000').fontSize(9)
          doc.text(dateLabel, colX.date, y, { width: 95 })
          doc.text(row.typeLabel, colX.type, y, { width: 160 })
          doc.text(formatNairaAmount(row.amount), colX.amount, y, { width: 90 })
          doc.text(row.userName || '—', colX.by, y, { width: 120 })
          doc.moveDown(0.6)
        }
      }

      doc.end()
    })
  }
}

const expenseService = new ExpenseService()
export default expenseService
