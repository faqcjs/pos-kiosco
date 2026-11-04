// Where each peso sold went: cost of goods, uncosted sales, each expense category and what is left.

// Segment keys shared with the bar colors in result-flow-bar.jsx
export const SEGMENT = Object.freeze({ COST: 'cost', UNCOSTED: 'uncosted', NET: 'net' })
export const EXPENSE_PREFIX = 'expense:'

/** Whole percent of a 0..1 share, or '' when there is no share. */
export const formatShare = (share) => (share === null ? '' : `${Math.round(share * 100)}%`)

/** amount / net sales, or null when there were no sales to compare with. */
export function shareOfSales(amount, netSales) {
  return netSales > 0 ? amount / netSales : null
}

/**
 * Segments of one bar for a month result.
 * With a profit the bar is the net sales: cost, uncosted sales, expenses and what is left ('net').
 * With a loss the bar is everything that had to be covered (cost, uncosted sales and expenses),
 * and `uncovered` is the part of it that sales did not cover.
 */
export function buildResultFlow(month) {
  const isLoss = month.netResult < 0
  const parts = [
    { key: SEGMENT.COST, label: 'Costo de mercadería', amount: month.costOfGoodsSold },
    { key: SEGMENT.UNCOSTED, label: 'Ventas sin costo', amount: month.uncostedRevenue },
    ...month.expensesByCategory.map((row) => ({ key: `${EXPENSE_PREFIX}${row.category}`, label: row.label, amount: row.total })),
    ...(isLoss ? [] : [{ key: SEGMENT.NET, label: 'Te quedó', amount: month.netResult }]),
  ].filter((part) => part.amount > 0)

  const base = isLoss ? parts.reduce((sum, part) => sum + part.amount, 0) : month.netSales
  if (!(base > 0)) return { isLoss, base: 0, segments: [], uncovered: null }

  return {
    isLoss,
    base,
    segments: parts.map((part) => ({ ...part, share: part.amount / base })),
    uncovered: isLoss ? { amount: -month.netResult, share: -month.netResult / base } : null,
  }
}
