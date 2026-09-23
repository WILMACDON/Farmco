import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DataTablePaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
}

export function DataTablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: DataTablePaginationProps) {
  const totalPages = Math.ceil(total / pageSize)

  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = []

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      if (page <= 3) {
        for (let i = 2; i <= 4; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      } else if (page >= totalPages - 2) {
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        pages.push('...')
        for (let i = page - 1; i <= page + 1; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }, [page, totalPages])

  return (
    <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
      <div className='flex items-center gap-2'>
        <span className='text-sm text-muted-foreground'>Rows per page:</span>
        {onPageSizeChange ? (
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}>
            <SelectTrigger className='w-[70px]'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className='text-sm font-medium'>{pageSize}</span>
        )}
      </div>

      {totalPages > 1 && (
        <div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => onPageChange(1)}
              disabled={page <= 1}>
              <ChevronsLeft className='h-4 w-4' />
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}>
              <ChevronLeft className='h-4 w-4' />
            </Button>

            <div className='flex items-center gap-1'>
              {pageNumbers.map((p, idx) => {
                if (p === '...') {
                  return (
                    <span key={`ellipsis-${page}-${idx}`} className='px-2 text-muted-foreground'>
                      ...
                    </span>
                  )
                }
                const pageNum = p as number
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'default' : 'outline'}
                    size='sm'
                    className='min-w-[40px]'
                    onClick={() => onPageChange(pageNum)}>
                    {pageNum}
                  </Button>
                )
              })}
            </div>

            <Button
              variant='outline'
              size='sm'
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}>
              <ChevronRight className='h-4 w-4' />
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => onPageChange(totalPages)}
              disabled={page >= totalPages}>
              <ChevronsRight className='h-4 w-4' />
            </Button>
          </div>
          <p className='pt-2 text-right text-sm text-muted-foreground'>
            Showing {((page - 1) * pageSize + 1).toLocaleString()} to{' '}
            {Math.min(page * pageSize, total).toLocaleString()} of {total.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  )
}
