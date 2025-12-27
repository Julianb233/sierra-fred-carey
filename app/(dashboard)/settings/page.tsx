"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Settings, 
  User, 
  CreditCard, 
  Bell, 
  Shield,
  CheckCircle2,
  Crown,
  Mail,
  Calendar
} from "lucide-react";

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    name: "John Doe",
    email: "john@example.com",
    company: "My Startup Inc.",
    role: "Founder & CEO",
    joinedDate: "January 2024"
  });

  const [notifications, setNotifications] = useState({
    emailUpdates: true,
    productNews: true,
    weeklyDigest: false,
    documentReady: true
  });

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <User className="h-5 w-5" />
            <CardTitle>Profile Information</CardTitle>
          </div>
          <CardDescription>
            Update your personal information and startup details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl">
                {profile.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button variant="outline" size="sm">Change Photo</Button>
              <p className="text-xs text-muted-foreground">
                JPG, PNG or GIF. Max size 2MB.
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company Name</Label>
              <Input
                id="company"
                value={profile.company}
                onChange={(e) => setProfile({ ...profile, company: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Your Role</Label>
              <Input
                id="role"
                value={profile.role}
                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button>Save Changes</Button>
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5" />
            <CardTitle>Subscription</CardTitle>
          </div>
          <CardDescription>
            Manage your subscription and billing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-3 rounded-lg">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg">Pro Plan</h3>
                  <Badge className="bg-green-500">Active</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  $99/month • Billed monthly
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Next billing date: Feb 1, 2024
                </div>
              </div>
            </div>
            <Button variant="outline">Manage Plan</Button>
          </div>

          <div className="space-y-3 pt-4">
            <h4 className="font-semibold text-sm">Plan Features</h4>
            <div className="grid gap-2">
              {[
                "Unlimited Reality Lens analyses",
                "Advanced investor readiness scoring",
                "AI-powered document generation",
                "Priority email support",
                "Early access to new features"
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button variant="outline">Update Payment Method</Button>
            <Button variant="outline">View Billing History</Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>
            Choose what updates you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              key: 'emailUpdates',
              title: 'Email Updates',
              description: 'Receive email notifications about your account activity',
              icon: Mail
            },
            {
              key: 'documentReady',
              title: 'Document Ready',
              description: 'Get notified when AI-generated documents are ready',
              icon: CheckCircle2
            },
            {
              key: 'productNews',
              title: 'Product News',
              description: 'Updates about new features and improvements',
              icon: Bell
            },
            {
              key: 'weeklyDigest',
              title: 'Weekly Digest',
              description: 'Weekly summary of your startup progress',
              icon: Calendar
            }
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-start gap-3">
                <item.icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <h4 className="font-semibold">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <Button
                variant={notifications[item.key as keyof typeof notifications] ? "default" : "outline"}
                size="sm"
                onClick={() => setNotifications({
                  ...notifications,
                  [item.key]: !notifications[item.key as keyof typeof notifications]
                })}
              >
                {notifications[item.key as keyof typeof notifications] ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5" />
            <CardTitle>Security</CardTitle>
          </div>
          <CardDescription>
            Keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-semibold">Password</h4>
              <p className="text-sm text-muted-foreground">
                Last changed 3 months ago
              </p>
            </div>
            <Button variant="outline">Change Password</Button>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-semibold">Two-Factor Authentication</h4>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account
              </p>
            </div>
            <Button variant="outline">Enable 2FA</Button>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-semibold">Active Sessions</h4>
              <p className="text-sm text-muted-foreground">
                Manage devices where you're logged in
              </p>
            </div>
            <Button variant="outline">View Sessions</Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions for your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
            <div>
              <h4 className="font-semibold">Delete Account</h4>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="destructive">Delete Account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
