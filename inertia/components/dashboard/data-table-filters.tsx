import { Filter } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDisclosure } from '@/hooks/use-disclosure'

interface FilterColumn {
  key: string
  header: string
  filterType?: 'text' | 'select' | 'date' | 'dateRange'
  filterOptions?: { value: string; label: string }[]
}

interface FilterPreset {
  name: string
  filters: Record<string, unknown>
}

interface DataTableFiltersProps {
  columns: FilterColumn[]
  filters: Record<string, unknown>
  onFiltersChange: (filters: Record<string, unknown>) => void
  presets?: FilterPreset[]
}

export function DataTableFilters({
  columns,
  filters,
  onFiltersChange,
  presets = [],
}: DataTableFiltersProps) {
  const disclosure = useDisclosure()
  const [activePreset, setActivePreset] = useState<string | null>(null)

  const activeCount = Object.values(filters).filter(
    (v) => v !== null && v !== undefined && v !== '',
  ).length

  function handleFilterChange(key: string, value: unknown) {
    const next = { ...filters, [key]: value }
    setActivePreset(null)
    onFiltersChange(next)
  }

  function handlePresetSelect(preset: FilterPreset) {
    setActivePreset(preset.name)
    onFiltersChange(preset.filters)
  }

  function clearFilters() {
    setActivePreset(null)
    onFiltersChange({})
  }

  return (
    <Popover open={disclosure.isOpen} onOpenChange={disclosure.onOpenChange}>
      <PopoverTrigger>
        <Button variant='outline' size='sm' leftIcon={<Filter className='h-4 w-4' />}>
          Filters
          {activeCount > 0 && (
            <span className='ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground'>
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-80' align='start'>
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h4 className='font-medium'>Filters</h4>
            {activeCount > 0 && (
              <Button variant='ghost' size='sm' onClick={clearFilters} className='h-8 text-xs'>
                Clear all
              </Button>
            )}
          </div>

          {presets.length > 0 && (
            <div className='space-y-2'>
              <Label className='text-xs text-muted-foreground'>Presets</Label>
              <div className='flex flex-wrap gap-2'>
                {presets.map((preset) => (
                  <Button
                    key={preset.name}
                    variant={activePreset === preset.name ? 'default' : 'outline'}
                    size='sm'
                    className='h-7 text-xs'
                    onClick={() => handlePresetSelect(preset)}>
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className='space-y-3'>
            {columns.map((column) => (
              <div key={column.key} className='space-y-2'>
                <Label className='text-xs'>{column.header}</Label>
                {column.filterType === 'select' && column.filterOptions ? (
                  <Select
                    value={String(filters[column.key] || '__all__')}
                    onValueChange={(value) =>
                      handleFilterChange(column.key, value === '__all__' ? null : value)
                    }>
                    <SelectTrigger className='h-8'>
                      <SelectValue placeholder={`All ${column.header}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='__all__'>All {column.header}</SelectItem>
                      {column.filterOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : column.filterType === 'dateRange' ? (
                  <div className='grid grid-cols-2 gap-2'>
                    <DatePicker
                      value={(filters[column.key] as { from?: string })?.from || ''}
                      onChange={(v) =>
                        handleFilterChange(column.key, {
                          ...((filters[column.key] as { from?: string; to?: string }) || {}),
                          from: v || undefined,
                        })
                      }
                      clearable
                      buttonSize='sm'
                      buttonClassName='h-8'
                    />
                    <DatePicker
                      value={(filters[column.key] as { to?: string })?.to || ''}
                      onChange={(v) =>
                        handleFilterChange(column.key, {
                          ...((filters[column.key] as { from?: string; to?: string }) || {}),
                          to: v || undefined,
                        })
                      }
                      clearable
                      buttonSize='sm'
                      buttonClassName='h-8'
                    />
                  </div>
                ) : (
                  <Input
                    type='text'
                    placeholder={`Filter ${column.header}...`}
                    value={String(filters[column.key] || '')}
                    onChange={(e) => handleFilterChange(column.key, e.target.value || null)}
                    className='h-8'
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export type { FilterColumn, FilterPreset }
