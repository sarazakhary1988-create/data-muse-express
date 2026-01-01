import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, CalendarDays, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export type TimeFrameType = 'all' | 'year' | 'quarter' | 'month' | 'dateRange' | 'singleDate';

export interface TimeFrameValue {
  type: TimeFrameType;
  year?: number;
  quarter?: number; // 1-4
  month?: number; // 0-11
  startDate?: Date;
  endDate?: Date;
  singleDate?: Date;
}

interface TimeFrameFilterProps {
  value: TimeFrameValue;
  onChange: (value: TimeFrameValue) => void;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - i + 1);
const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const quarters = [
  { value: 1, label: 'Q1 (Jan-Mar)' },
  { value: 2, label: 'Q2 (Apr-Jun)' },
  { value: 3, label: 'Q3 (Jul-Sep)' },
  { value: 4, label: 'Q4 (Oct-Dec)' },
];

export const TimeFrameFilter = ({ value, onChange }: TimeFrameFilterProps) => {
  const [open, setOpen] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end' | 'single'>('start');

  const getDisplayLabel = (): string => {
    switch (value.type) {
      case 'all':
        return 'All Time';
      case 'year':
        return value.year ? `Year ${value.year}` : 'Select Year';
      case 'quarter':
        return value.year && value.quarter 
          ? `Q${value.quarter} ${value.year}` 
          : 'Select Quarter';
      case 'month':
        return value.year && value.month !== undefined 
          ? `${months[value.month]} ${value.year}` 
          : 'Select Month';
      case 'dateRange':
        if (value.startDate && value.endDate) {
          return `${format(value.startDate, 'MMM d, yyyy')} - ${format(value.endDate, 'MMM d, yyyy')}`;
        }
        return 'Select Date Range';
      case 'singleDate':
        return value.singleDate 
          ? format(value.singleDate, 'MMM d, yyyy') 
          : 'Select Date';
      default:
        return 'Time Frame';
    }
  };

  const handleTypeChange = (type: TimeFrameType) => {
    onChange({ 
      type, 
      year: type !== 'all' ? currentYear : undefined,
      quarter: type === 'quarter' ? 1 : undefined,
      month: type === 'month' ? 0 : undefined,
    });
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    if (value.type === 'singleDate') {
      onChange({ ...value, singleDate: date });
    } else if (value.type === 'dateRange') {
      if (datePickerMode === 'start') {
        onChange({ ...value, startDate: date, endDate: undefined });
        setDatePickerMode('end');
      } else {
        onChange({ ...value, endDate: date });
        setDatePickerMode('start');
      }
    }
  };

  const isActive = value.type !== 'all';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 h-7 text-xs ${isActive ? 'border-primary text-primary' : 'border-muted'}`}
        >
          <CalendarDays className="w-3 h-3" />
          <span className="max-w-[120px] truncate">{getDisplayLabel()}</span>
          {isActive && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              Active
            </Badge>
          )}
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b border-border">
          <p className="text-sm font-medium">Time Frame Filter</p>
          <p className="text-xs text-muted-foreground mt-1">
            Filter research results by time period
          </p>
        </div>

        <div className="p-3 space-y-3">
          {/* Type Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Filter Type</label>
            <Select value={value.type} onValueChange={(v) => handleTypeChange(v as TimeFrameType)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="year">Specific Year</SelectItem>
                <SelectItem value="quarter">Quarter</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="dateRange">Date Range</SelectItem>
                <SelectItem value="singleDate">Single Date</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Year Selector */}
          <AnimatePresence>
            {(value.type === 'year' || value.type === 'quarter' || value.type === 'month') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <label className="text-xs font-medium text-muted-foreground">Year</label>
                <Select 
                  value={value.year?.toString()} 
                  onValueChange={(v) => onChange({ ...value, year: parseInt(v) })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quarter Selector */}
          <AnimatePresence>
            {value.type === 'quarter' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <label className="text-xs font-medium text-muted-foreground">Quarter</label>
                <Select 
                  value={value.quarter?.toString()} 
                  onValueChange={(v) => onChange({ ...value, quarter: parseInt(v) })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select quarter" />
                  </SelectTrigger>
                  <SelectContent>
                    {quarters.map((q) => (
                      <SelectItem key={q.value} value={q.value.toString()}>
                        {q.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Month Selector */}
          <AnimatePresence>
            {value.type === 'month' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <label className="text-xs font-medium text-muted-foreground">Month</label>
                <Select 
                  value={value.month?.toString()} 
                  onValueChange={(v) => onChange({ ...value, month: parseInt(v) })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month, idx) => (
                      <SelectItem key={idx} value={idx.toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Date Range / Single Date Picker */}
          <AnimatePresence>
            {(value.type === 'dateRange' || value.type === 'singleDate') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                {value.type === 'dateRange' && (
                  <div className="flex gap-2 mb-2">
                    <Button
                      variant={datePickerMode === 'start' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={() => setDatePickerMode('start')}
                    >
                      Start: {value.startDate ? format(value.startDate, 'MMM d') : 'Select'}
                    </Button>
                    <Button
                      variant={datePickerMode === 'end' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={() => setDatePickerMode('end')}
                    >
                      End: {value.endDate ? format(value.endDate, 'MMM d') : 'Select'}
                    </Button>
                  </div>
                )}
                <CalendarComponent
                  mode="single"
                  selected={
                    value.type === 'singleDate' 
                      ? value.singleDate 
                      : datePickerMode === 'start' 
                        ? value.startDate 
                        : value.endDate
                  }
                  onSelect={handleDateSelect}
                  className="rounded-md border"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Clear Button */}
        {isActive && (
          <div className="p-3 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => {
                onChange({ type: 'all' });
                setOpen(false);
              }}
            >
              Clear Filter
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

// Helper function to convert TimeFrameValue to a query string
export const formatTimeFrameForQuery = (value: TimeFrameValue): string => {
  switch (value.type) {
    case 'all':
      return '';
    case 'year':
      return value.year ? `in ${value.year}` : '';
    case 'quarter':
      if (value.year && value.quarter) {
        const quarterMonths = {
          1: 'January to March',
          2: 'April to June',
          3: 'July to September',
          4: 'October to December',
        };
        return `during Q${value.quarter} ${value.year} (${quarterMonths[value.quarter as keyof typeof quarterMonths]})`;
      }
      return '';
    case 'month':
      if (value.year && value.month !== undefined) {
        return `in ${months[value.month]} ${value.year}`;
      }
      return '';
    case 'dateRange':
      if (value.startDate && value.endDate) {
        return `between ${format(value.startDate, 'MMMM d, yyyy')} and ${format(value.endDate, 'MMMM d, yyyy')}`;
      }
      return '';
    case 'singleDate':
      if (value.singleDate) {
        return `on ${format(value.singleDate, 'MMMM d, yyyy')}`;
      }
      return '';
    default:
      return '';
  }
};
