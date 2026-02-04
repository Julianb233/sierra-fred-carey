'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, RefreshCw, Copy } from 'lucide-react';

interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

interface BusinessHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface BusinessHoursEditorProps {
  hours: BusinessHours;
  timezone: string;
  onSave: (hours: BusinessHours, timezone: string) => Promise<void>;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS: Record<typeof DAYS[number], string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = i % 2 === 0 ? '00' : '30';
  const h = hours.toString().padStart(2, '0');
  return `${h}:${minutes}`;
});

const TIMEZONES = [
  { id: 'America/New_York', label: 'Eastern Time (ET)' },
  { id: 'America/Chicago', label: 'Central Time (CT)' },
  { id: 'America/Denver', label: 'Mountain Time (MT)' },
  { id: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { id: 'America/Phoenix', label: 'Arizona (no DST)' },
  { id: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { id: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { id: 'UTC', label: 'UTC' },
  { id: 'Europe/London', label: 'London (GMT/BST)' },
  { id: 'Europe/Paris', label: 'Paris (CET/CEST)' },
];

export function BusinessHoursEditor({ hours, timezone, onSave }: BusinessHoursEditorProps) {
  const [formData, setFormData] = useState<BusinessHours>(hours);
  const [selectedTimezone, setSelectedTimezone] = useState(timezone);
  const [saving, setSaving] = useState(false);

  const handleDayChange = (day: typeof DAYS[number], field: keyof DaySchedule, value: boolean | string) => {
    setFormData(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData, selectedTimezone);
    } finally {
      setSaving(false);
    }
  };

  const copyToWeekdays = (sourceDay: typeof DAYS[number]) => {
    const source = formData[sourceDay];
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;

    setFormData(prev => {
      const updated = { ...prev };
      weekdays.forEach(day => {
        updated[day] = { ...source };
      });
      return updated;
    });
  };

  const setAllEnabled = (enabled: boolean) => {
    setFormData(prev => {
      const updated = { ...prev };
      DAYS.forEach(day => {
        updated[day] = { ...prev[day], enabled };
      });
      return updated;
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Hours</CardTitle>
          <CardDescription>
            Set when your AI agent is available to answer calls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="space-y-2 w-full sm:w-auto">
              <Label>Timezone</Label>
              <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                <SelectTrigger className="w-full sm:w-[240px]">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.id} value={tz.id}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setAllEnabled(true)}>
                Enable All
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAllEnabled(false)}>
                Disable All
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {DAYS.map((day) => (
              <div
                key={day}
                className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border ${
                  formData[day].enabled ? 'bg-background' : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-[140px]">
                  <Switch
                    checked={formData[day].enabled}
                    onCheckedChange={(checked) => handleDayChange(day, 'enabled', checked)}
                  />
                  <span className={`font-medium ${!formData[day].enabled ? 'text-muted-foreground' : ''}`}>
                    {DAY_LABELS[day]}
                  </span>
                </div>

                {formData[day].enabled && (
                  <>
                    <div className="flex items-center gap-2 flex-1">
                      <Select
                        value={formData[day].start}
                        onValueChange={(value) => handleDayChange(day, 'start', value)}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <span className="text-muted-foreground">to</span>

                      <Select
                        value={formData[day].end}
                        onValueChange={(value) => handleDayChange(day, 'end', value)}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {(day === 'monday' || day === 'saturday') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToWeekdays(day)}
                        title={day === 'monday' ? 'Copy to all weekdays' : 'Copy to weekend'}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        {day === 'monday' ? 'Copy to weekdays' : 'Copy to weekend'}
                      </Button>
                    )}
                  </>
                )}

                {!formData[day].enabled && (
                  <span className="text-sm text-muted-foreground">Closed</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Presets */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Presets</CardTitle>
          <CardDescription>Apply common business hour configurations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFormData({
                  monday: { enabled: true, start: '09:00', end: '17:00' },
                  tuesday: { enabled: true, start: '09:00', end: '17:00' },
                  wednesday: { enabled: true, start: '09:00', end: '17:00' },
                  thursday: { enabled: true, start: '09:00', end: '17:00' },
                  friday: { enabled: true, start: '09:00', end: '17:00' },
                  saturday: { enabled: false, start: '10:00', end: '14:00' },
                  sunday: { enabled: false, start: '10:00', end: '14:00' },
                });
              }}
            >
              Standard (9-5 Mon-Fri)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFormData({
                  monday: { enabled: true, start: '08:00', end: '18:00' },
                  tuesday: { enabled: true, start: '08:00', end: '18:00' },
                  wednesday: { enabled: true, start: '08:00', end: '18:00' },
                  thursday: { enabled: true, start: '08:00', end: '18:00' },
                  friday: { enabled: true, start: '08:00', end: '18:00' },
                  saturday: { enabled: true, start: '09:00', end: '13:00' },
                  sunday: { enabled: false, start: '10:00', end: '14:00' },
                });
              }}
            >
              Extended (8-6 + Sat)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFormData({
                  monday: { enabled: true, start: '00:00', end: '23:30' },
                  tuesday: { enabled: true, start: '00:00', end: '23:30' },
                  wednesday: { enabled: true, start: '00:00', end: '23:30' },
                  thursday: { enabled: true, start: '00:00', end: '23:30' },
                  friday: { enabled: true, start: '00:00', end: '23:30' },
                  saturday: { enabled: true, start: '00:00', end: '23:30' },
                  sunday: { enabled: true, start: '00:00', end: '23:30' },
                });
              }}
            >
              24/7
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => { setFormData(hours); setSelectedTimezone(timezone); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Hours
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
