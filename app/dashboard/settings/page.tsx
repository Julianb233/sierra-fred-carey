"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { NotificationChannels } from "@/components/settings/NotificationChannels"

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    weekly: true,
    marketing: false,
  })

  const [profile, setProfile] = useState({
    name: "Fred Cary",
    email: "founder@startup.com",
    company: "My Startup Inc.",
  })

  const [currentPlan] = useState<"Free" | "Pro" | "Studio">("Free")

  const planPrices = {
    Free: "$0/month",
    Pro: "$49/month",
    Studio: "$199/month",
  }

  const planFeatures = {
    Free: [
      "1 active project",
      "Basic investor scoring",
      "Weekly reality lens",
      "Email support",
    ],
    Pro: [
      "5 active projects",
      "Advanced analytics",
      "Daily reality lens",
      "Priority support",
      "Custom pitch deck templates",
    ],
    Studio: [
      "Unlimited projects",
      "White-label options",
      "Real-time collaboration",
      "Dedicated success manager",
      "API access",
      "Custom integrations",
    ],
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
                FC
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
                onChange={(e) =>
                  setProfile({ ...profile, email: e.target.value })
                }
              />
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

          <Button className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90">
            Save Changes
          </Button>
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
                  {currentPlan}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {planPrices[currentPlan]}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Plan Features</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {planFeatures[currentPlan as keyof typeof planFeatures].map(
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
            <Button variant="outline">Manage Subscription</Button>
            {currentPlan !== "Studio" && (
              <Button className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90">
                Upgrade Plan
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notifications Section */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
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
        </CardContent>
      </Card>

      {/* Notification Channels Section */}
      <NotificationChannels />

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
            <Button variant="outline" size="sm">
              Export Data
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
            <Button variant="outline" size="sm" className="border-destructive text-destructive hover:bg-destructive hover:text-white">
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
