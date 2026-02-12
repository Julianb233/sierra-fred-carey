"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { NotificationSettings } from "@/components/settings/NotificationSettings"
import { VoiceSettings } from "@/components/settings/voice-settings"
import { ConsentSettings } from "@/components/settings/ConsentSettings"
import { useTier } from "@/lib/context/tier-context"
import { createClient } from "@/lib/supabase/client"
import { UserTier, TIER_FEATURES } from "@/lib/constants"
import { redirectToPortal } from "@/lib/stripe/client"
import { UpgradeTier } from "@/components/dashboard/UpgradeTier"
import { toast } from "sonner"
import { Volume2 } from "lucide-react"
import { TeamSettings } from "@/components/settings/team-settings"
import { trackEvent } from "@/lib/analytics"
import { ANALYTICS_EVENTS } from "@/lib/analytics/events"

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    weekly: true,
    marketing: false,
  })

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    company: "",
  })

  const { tier, tierName, isSubscriptionActive, isLoading: tierLoading } = useTier()
  const [isProfileLoading, setIsProfileLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [notifSaveLoading, setNotifSaveLoading] = useState(false)

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("name, metadata")
          .eq("id", authUser.id)
          .single()
        setProfile({
          name: profileData?.name || authUser.email?.split("@")[0] || "",
          email: authUser.email || "",
          company: profileData?.metadata?.company_name || "",
        })
        // Restore notification preferences if stored
        if (profileData?.metadata?.notification_prefs) {
          setNotifications(prev => ({
            ...prev,
            ...profileData.metadata.notification_prefs,
          }))
        }
      }
      setIsProfileLoading(false)
    }
    fetchProfile()
  }, [])

  const planPrice = tier === UserTier.STUDIO ? "$249/month"
    : tier === UserTier.PRO ? "$99/month"
    : "$0/month"

  const planFeatures = TIER_FEATURES[tier]

  const handleManageSubscription = async () => {
    try {
      setPortalLoading(true)
      await redirectToPortal()
    } catch (err) {
      console.error("Portal error:", err)
    } finally {
      setPortalLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setSaveLoading(true)
      setSaveMessage(null)
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      // Fetch existing metadata to merge with
      const { data: existing } = await supabase
        .from("profiles")
        .select("metadata")
        .eq("id", authUser.id)
        .single()

      const { error } = await supabase
        .from("profiles")
        .update({
          name: profile.name,
          metadata: {
            ...(existing?.metadata || {}),
            company_name: profile.company,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", authUser.id)

      if (error) throw error
      trackEvent(ANALYTICS_EVENTS.ENGAGEMENT.SETTINGS_UPDATED, { settingChanged: "profile" })
      setSaveMessage({ type: 'success', text: 'Profile saved successfully' })
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err) {
      console.error("Save error:", err)
      setSaveMessage({ type: 'error', text: 'Failed to save profile' })
    } finally {
      setSaveLoading(false)
    }
  }

  const handleExportData = async () => {
    try {
      setExportLoading(true)
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single()

      const exportData = {
        exportedAt: new Date().toISOString(),
        profile: profileData,
        email: authUser.email,
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `fred-data-export-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      trackEvent(ANALYTICS_EVENTS.ENGAGEMENT.DOCUMENT_EXPORTED, { exportFormat: "json" })
    } catch (err) {
      console.error("Export error:", err)
    } finally {
      setExportLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }
    try {
      setDeleteLoading(true)
      const res = await fetch("/api/user/delete", { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete account")
      }
      localStorage.clear()
      window.location.href = "/login"
    } catch (err) {
      console.error("Delete error:", err)
      toast.error(err instanceof Error ? err.message : "Failed to delete account")
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleSaveNotifications = async () => {
    try {
      setNotifSaveLoading(true)
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      // Fetch existing metadata to merge with
      const { data: existing } = await supabase
        .from("profiles")
        .select("metadata")
        .eq("id", authUser.id)
        .single()

      const { error } = await supabase
        .from("profiles")
        .update({
          metadata: {
            ...(existing?.metadata || {}),
            notification_prefs: notifications,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", authUser.id)

      if (error) throw error
      toast.success("Notification preferences saved")
    } catch (err) {
      console.error("Save notifications error:", err)
      toast.error("Failed to save notification preferences")
    } finally {
      setNotifSaveLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account, subscription, and preferences.
        </p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update your personal information and account details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-[#ff6a1a] text-white text-2xl font-semibold">
                {profile.name ? profile.name.split(" ").map(n => n[0]).join("").toUpperCase() : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-sm font-medium">Profile Picture</p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG up to 2MB
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) =>
                  setProfile({ ...profile, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed here. Contact support to update your email.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company Name</Label>
              <Input
                id="company"
                value={profile.company}
                onChange={(e) =>
                  setProfile({ ...profile, company: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90"
              onClick={handleSaveProfile}
              disabled={saveLoading}
            >
              {saveLoading ? "Saving..." : "Save Changes"}
            </Button>
            {saveMessage && (
              <p className={`text-sm ${saveMessage.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
                {saveMessage.text}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subscription Section */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>
            Manage your subscription plan and billing information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Current Plan</p>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-[#ff6a1a]/10 text-[#ff6a1a] hover:bg-[#ff6a1a]/20"
                >
                  {tierName}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {planPrice}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Plan Features</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {planFeatures.map(
                (feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 text-[#ff6a1a]"
                      fill="none"
                      strokeWidth="2"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                )
              )}
            </ul>
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleManageSubscription}
              disabled={portalLoading || !isSubscriptionActive}
            >
              {portalLoading ? "Opening..." : "Manage Subscription"}
            </Button>
            {tier !== UserTier.STUDIO && (
              <UpgradeTier currentTier={tier} isSubscriptionActive={isSubscriptionActive} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alert Notification Settings - Slack/PagerDuty */}
      <NotificationSettings />

      {/* General Notifications Section */}
      <Card>
        <CardHeader>
          <CardTitle>General Notifications</CardTitle>
          <CardDescription>
            Configure how you receive updates and alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications" className="text-base">
                Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive email updates about your projects and account
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={notifications.email}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, email: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sms-reminders" className="text-base">
                SMS Check-in Reminders
              </Label>
              <p className="text-sm text-muted-foreground">
                Get text reminders for weekly check-ins and updates
              </p>
            </div>
            <Switch
              id="sms-reminders"
              checked={notifications.sms}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, sms: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="weekly-digest" className="text-base">
                Weekly Digest
              </Label>
              <p className="text-sm text-muted-foreground">
                Summary of your progress and insights every Monday
              </p>
            </div>
            <Switch
              id="weekly-digest"
              checked={notifications.weekly}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, weekly: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="marketing-emails" className="text-base">
                Marketing Emails
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive updates about new features and promotions
              </p>
            </div>
            <Switch
              id="marketing-emails"
              checked={notifications.marketing}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, marketing: checked })
              }
            />
          </div>

          <Separator />

          <Button
            variant="outline"
            onClick={handleSaveNotifications}
            disabled={notifSaveLoading}
          >
            {notifSaveLoading ? "Saving..." : "Save Preferences"}
          </Button>
        </CardContent>
      </Card>

      {/* Community Data Sharing Consent */}
      <ConsentSettings />

      {/* Voice & TTS Settings - Pro+ only */}
      {tier >= UserTier.PRO && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-[#ff6a1a]" />
              Voice &amp; TTS
            </CardTitle>
            <CardDescription>
              Configure how FRED sounds when reading responses aloud.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VoiceSettings />
          </CardContent>
        </Card>
      )}

      {/* Team & Collaboration - Studio only */}
      {tier >= UserTier.STUDIO && (
        <TeamSettings currentTier={tier} />
      )}

      {/* Danger Zone Section */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that affect your account and data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Export Your Data</p>
              <p className="text-xs text-muted-foreground">
                Download a copy of all your account data and projects
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportData} disabled={exportLoading}>
              {exportLoading ? "Exporting..." : "Export Data"}
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-destructive p-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-destructive">
                Delete Account
              </p>
              <p className="text-xs text-muted-foreground">
                Permanently delete your account and all associated data
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-destructive text-destructive hover:bg-destructive hover:text-white"
              onClick={handleDeleteAccount}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting..." : showDeleteConfirm ? "Click again to confirm" : "Delete Account"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
