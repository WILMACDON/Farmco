import type { HttpContext } from '@adonisjs/core/http'
import Workspace from '#models/workspace'
import expenseService from '#services/expense_service'
import { isFarmContext, requireFarmContext } from '#utils/farm_context'
import {
  createExpenseValidator,
  expenseExportValidator,
  expenseFilterValidator,
} from '#validators/farm'

export default class ExpensesController {
  async index(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    const filters = await ctx.request.validateUsing(expenseFilterValidator, {
      data: ctx.request.qs(),
    })

    const rangeOptions = {
      range: filters.range ?? '7d',
      from: filters.from,
      to: filters.to,
    }

    const [summary, records] = await Promise.all([
      expenseService.getSummary(farm.workspaceId, rangeOptions),
      expenseService.listForRange(farm.workspaceId, rangeOptions),
    ])

    return ctx.inertia.render('expenses/index', {
      summary,
      records,
      filters: { ...filters, range: rangeOptions.range },
      farmRole: farm.farmRole,
    })
  }

  async store(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    const payload = await ctx.request.validateUsing(createExpenseValidator)

    try {
      const record = await expenseService.create(farm.workspaceId, farm.user.id, {
        category: payload.category,
        customType: payload.customType,
        amount: payload.amount,
        note: payload.note,
        clientEntryId: payload.clientEntryId,
        recordedAt: payload.recordedAt,
      })

      return ctx.response.created({
        message: 'Expense recorded.',
        data: { recordId: record.id },
      })
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number }
      return ctx.response.status(err.status ?? 400).json({
        error: err.message || 'Unable to record expense.',
      })
    }
  }

  async export(ctx: HttpContext) {
    const farm = await requireFarmContext(ctx)
    if (!isFarmContext(farm)) return farm.errorResponse

    const query = await ctx.request.validateUsing(expenseExportValidator, {
      data: ctx.request.qs(),
    })

    const rangeOptions = {
      range: query.range ?? '7d',
      from: query.from,
      to: query.to,
    }
    const stamp = new Date().toISOString().slice(0, 10)
    const workspace = await Workspace.findOrFail(farm.workspaceId)

    if (query.format === 'pdf') {
      const pdf = await expenseService.buildPdf(farm.workspaceId, workspace.name, rangeOptions)
      ctx.response.header('Content-Type', 'application/pdf')
      ctx.response.header(
        'Content-Disposition',
        `attachment; filename="farm-expenses-${stamp}.pdf"`,
      )
      return ctx.response.send(pdf)
    }

    const csv = await expenseService.buildCsv(farm.workspaceId, rangeOptions)
    ctx.response.header('Content-Type', 'text/csv; charset=utf-8')
    ctx.response.header(
      'Content-Disposition',
      `attachment; filename="farm-expenses-${stamp}.csv"`,
    )
    return ctx.response.send(csv)
  }
}
