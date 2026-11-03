import { useMemo, useState } from 'react'
import { buildShiftTimeline } from '@/lib/cash-movements'

export const HISTORY_ITEMS_PER_PAGE = 8

// Shift timeline (manual movements + sales) with client-side pagination.
export function useShiftTimeline(shift, sales) {
  const [historyPage, setHistoryPage] = useState(1)

  const timeline = useMemo(() => buildShiftTimeline(shift, sales), [shift, sales])

  const totalPages = Math.ceil(timeline.length / HISTORY_ITEMS_PER_PAGE) || 1
  const currentPage = Math.min(historyPage, totalPages)

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * HISTORY_ITEMS_PER_PAGE
    return timeline.slice(start, start + HISTORY_ITEMS_PER_PAGE)
  }, [timeline, currentPage])

  return { totalItems: timeline.length, pageItems, currentPage, totalPages, setHistoryPage }
}
