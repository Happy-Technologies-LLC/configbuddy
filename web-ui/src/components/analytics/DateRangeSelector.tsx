/**
 * DateRangeSelector Component
 * Date range picker with preset options and custom range selection
 */

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateRangeParams } from '../../services/analytics.service';

export interface DateRangeSelectorProps {
  onChange: (dateRange: DateRangeParams) => void;
  defaultRange?: PresetRange;
}

export type PresetRange = 'today' | '7days' | '30days' | '90days' | 'custom';

interface PresetOption {
  id: PresetRange;
  label: string;
  getRange: () => DateRangeParams;
}

const presetOptions: PresetOption[] = [
  {
    id: 'today',
    label: 'Today',
    getRange: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return {
        startDate: today.toISOString(),
        endDate: new Date().toISOString(),
      };
    },
  },
  {
    id: '7days',
    label: 'Last 7 Days',
    getRange: () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
    },
  },
  {
    id: '30days',
    label: 'Last 30 Days',
    getRange: () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
    },
  },
  {
    id: '90days',
    label: 'Last 90 Days',
    getRange: () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);
      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
    },
  },
];

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  onChange,
  defaultRange = '7days',
}) => {
  const [selectedRange, setSelectedRange] = useState<PresetRange>(defaultRange);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustom, setShowCustom] = useState(false);

  const handlePresetSelect = (preset: PresetOption) => {
    setSelectedRange(preset.id);
    setShowCustom(false);
    const range = preset.getRange();
    onChange(range);
  };

  const handleCustomRangeApply = () => {
    if (customStartDate && customEndDate) {
      setSelectedRange('custom');
      onChange({
        startDate: new Date(customStartDate).toISOString(),
        endDate: new Date(customEndDate).toISOString(),
      });
    }
  };

  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {presetOptions.map((preset) => (
              <Button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                variant={selectedRange === preset.id ? 'default' : 'outline'}
                size="sm"
              >
                {preset.label}
              </Button>
            ))}
            <Button
              onClick={() => setShowCustom(!showCustom)}
              variant={selectedRange === 'custom' ? 'default' : 'outline'}
              size="sm"
            >
              Custom
            </Button>
          </div>

          {showCustom && (
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
              <Button
                onClick={handleCustomRangeApply}
                disabled={!customStartDate || !customEndDate}
              >
                Apply
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
