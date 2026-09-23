import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SimpleGridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: number | { base?: number; sm?: number; md?: number; lg?: number; xl?: number }
  spacing?: number | string
  minChildWidth?: string
}

/**
 * Every possible responsive grid-cols class written out as a full literal string
 * so Tailwind v4's static scanner can detect and generate them.
 */
const responsiveGridCols: Record<string, Record<number, string>> = {
  base: {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    7: 'grid-cols-7',
    8: 'grid-cols-8',
    9: 'grid-cols-9',
    10: 'grid-cols-10',
    11: 'grid-cols-11',
    12: 'grid-cols-12',
  },
  sm: {
    1: 'sm:grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4',
    5: 'sm:grid-cols-5',
    6: 'sm:grid-cols-6',
    7: 'sm:grid-cols-7',
    8: 'sm:grid-cols-8',
    9: 'sm:grid-cols-9',
    10: 'sm:grid-cols-10',
    11: 'sm:grid-cols-11',
    12: 'sm:grid-cols-12',
  },
  md: {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5',
    6: 'md:grid-cols-6',
    7: 'md:grid-cols-7',
    8: 'md:grid-cols-8',
    9: 'md:grid-cols-9',
    10: 'md:grid-cols-10',
    11: 'md:grid-cols-11',
    12: 'md:grid-cols-12',
  },
  lg: {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
    7: 'lg:grid-cols-7',
    8: 'lg:grid-cols-8',
    9: 'lg:grid-cols-9',
    10: 'lg:grid-cols-10',
    11: 'lg:grid-cols-11',
    12: 'lg:grid-cols-12',
  },
  xl: {
    1: 'xl:grid-cols-1',
    2: 'xl:grid-cols-2',
    3: 'xl:grid-cols-3',
    4: 'xl:grid-cols-4',
    5: 'xl:grid-cols-5',
    6: 'xl:grid-cols-6',
    7: 'xl:grid-cols-7',
    8: 'xl:grid-cols-8',
    9: 'xl:grid-cols-9',
    10: 'xl:grid-cols-10',
    11: 'xl:grid-cols-11',
    12: 'xl:grid-cols-12',
  },
}

export const SimpleGrid = React.forwardRef<HTMLDivElement, SimpleGridProps>(
  ({ className, cols = 1, spacing = 4, minChildWidth, children, style, ...props }, ref) => {
    const spacingValue = typeof spacing === 'number' ? `${spacing * 0.25}rem` : spacing

    const isResponsive = typeof cols === 'object'

    const computedStyle = React.useMemo(() => {
      const base: React.CSSProperties = { gap: spacingValue, ...style }

      if (minChildWidth) {
        base.gridTemplateColumns = `repeat(auto-fit, minmax(${minChildWidth}, 1fr))`
      } else if (typeof cols === 'number') {
        // Simple numeric cols — always use inline style (reliable for any count)
        base.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`
      }
      // For responsive cols objects: do NOT set inline gridTemplateColumns
      // because it would override the Tailwind breakpoint classes.

      return base
    }, [spacingValue, minChildWidth, cols, style])

    // For responsive cols objects, look up full literal class names from the map.
    const gridClasses = React.useMemo(() => {
      if (!isResponsive) return ''

      const colsObj = cols as Record<string, number | undefined>
      const parts: string[] = []

      for (const bp of ['base', 'sm', 'md', 'lg', 'xl'] as const) {
        const v = colsObj[bp]
        if (v && responsiveGridCols[bp]?.[v]) {
          parts.push(responsiveGridCols[bp][v])
        }
      }

      return parts.join(' ')
    }, [cols, isResponsive])

    return (
      <div
        ref={ref}
        className={cn('grid', gridClasses, className)}
        style={computedStyle}
        {...props}>
        {children}
      </div>
    )
  },
)

SimpleGrid.displayName = 'SimpleGrid'
