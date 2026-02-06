"use client";

/**
 * Check-in Settings Component
 * Phase 04: Studio Tier Features - Plan 07
 *
 * Manages SMS check-in preferences: phone, schedule, timezone, opt-in.
 * Follows project UI patterns from components/tier and components/agents.
 */

import { useState, useCallback } from "react";
import { Phone, Clock, Globe, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { UserSMSPreferences } from "@/lib/sms/types";

// ============================================================================
// Constants
// ============================================================================

const DAYS_OF_WEEK = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const HOURS = Array.from({ length: 17 }, (_, i) => {
  const hour = i + 6; // 6am to 10pm
  const ampm = hour < 12 ? "AM" : "PM";
  const displayHour = hour <= 12 ? hour : hour - 12;
  return {
    value: String(hour),
    label: `${displayHour}:00 ${ampm}`,
  };
});

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HT)" },
  { value: "UTC", label: "UTC" },
];

// ============================================================================
// Component
// ============================================================================

interface CheckinSettingsProps {
  preferences?: UserSMSPreferences;
  onSave: (prefs: Partial<UserSMSPreferences>) => Promise<void>;
}

export function CheckinSettings({ preferences, onSave }: CheckinSettingsProps) {
  const [phoneNumber, setPhoneNumber] = useState(
    preferences?.phoneNumber || ""
  );
  const [checkinEnabled, setCheckinEnabled] = useState(
    preferences?.checkinEnabled ?? false
  );
  const [checkinDay, setCheckinDay] = useState(
    String(preferences?.checkinDay ?? 1)
  );
  const [checkinHour, setCheckinHour] = useState(
    String(preferences?.checkinHour ?? 9)
  );
  const [timezone, setTimezone] = useState(
    preferences?.timezone || "America/New_York"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(false);

      await onSave({
        phoneNumber: phoneNumber || undefined,
        checkinEnabled,
        checkinDay: Number(checkinDay),
        checkinHour: Number(checkinHour),
        timezone,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("[CheckinSettings] Save error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to save preferences."
      );
    } finally {
      setIsSaving(false);
    }
  }, [phoneNumber, checkinEnabled, checkinDay, checkinHour, timezone, onSave]);

  const hasPhoneNumber = phoneNumber.trim().length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-[#ff6a1a]" />
          Check-in Preferences
        </CardTitle>
        <CardDescription>
          Configure your weekly SMS accountability check-ins
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Phone Number */}
        <div className="space-y-2">
          <Label htmlFor="phone-number">Phone Number</Label>
          {!hasPhoneNumber && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 text-sm text-orange-700 dark:text-orange-400">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              Add your phone number to start receiving weekly check-ins.
            </div>
          )}
          <Input
            id="phone-number"
            type="tel"
            placeholder="+15551234567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            E.164 format (e.g., +15551234567). US numbers only during beta.
          </p>
        </div>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="checkin-enabled">Weekly Check-ins</Label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Receive SMS accountability check-ins
            </p>
          </div>
          <Switch
            id="checkin-enabled"
            checked={checkinEnabled}
            onCheckedChange={setCheckinEnabled}
          />
        </div>

        {/* Schedule Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Day of Week */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Day
            </Label>
            <Select value={checkinDay} onValueChange={setCheckinDay}>
              <SelectTrigger>
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map((day) => (
                  <SelectItem key={day.value} value={day.value}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Hour */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Time
            </Label>
            <Select value={checkinHour} onValueChange={setCheckinHour}>
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map((hour) => (
                  <SelectItem key={hour.value} value={hour.value}>
                    {hour.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              Timezone
            </Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* A2P Compliance Notice */}
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400">
          By enabling SMS check-ins, you consent to receiving weekly messages
          from Sahara. Reply STOP at any time to opt out. Message and data rates
          may apply.
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-sm text-green-600 dark:text-green-400">
            Preferences saved successfully.
          </div>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Preferences"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
