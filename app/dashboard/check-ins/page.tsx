'use client';

import { useState } from 'react';
import {
  Calendar,
  MessageSquare,
  Clock,
  TrendingUp,
  CheckCircle2,
  Smartphone,
  Bell,
  Settings,
} from 'lucide-react';

export default function CheckInsPage() {
  const [frequency, setFrequency] = useState('weekly');
  const [enabled, setEnabled] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [notificationTime, setNotificationTime] = useState('09:00');

  const stats = [
    {
      label: 'Current Streak',
      value: '6 weeks',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      label: 'Total Check-ins',
      value: '24',
      icon: MessageSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Avg Response Time',
      value: '2h',
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Completion Rate',
      value: '92%',
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  const recentCheckIns = [
    {
      date: '2025-12-20',
      summary: 'Closed first enterprise deal, working on scaling team',
      responded: true,
    },
    {
      date: '2025-12-13',
      summary: 'Launched new feature, hiring for 2 positions',
      responded: true,
    },
    {
      date: '2025-12-06',
      summary: 'Secured Series A funding, expanding to new markets',
      responded: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Weekly Check-ins</h1>
            <span className="px-3 py-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold rounded-full">
              Pro
            </span>
          </div>
          <p className="text-gray-600">
            Stay accountable with AI-powered SMS check-ins every week.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Phone Mockup Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center gap-2 mb-6">
              <Smartphone className="w-5 h-5 text-gray-700" />
              <h2 className="text-xl font-semibold text-gray-900">
                SMS Preview
              </h2>
            </div>

            {/* iPhone Mockup */}
            <div className="mx-auto max-w-sm">
              <div className="bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
                {/* Notch */}
                <div className="bg-black rounded-[2.5rem] overflow-hidden">
                  <div className="h-6 bg-black flex items-center justify-center">
                    <div className="w-32 h-5 bg-gray-900 rounded-b-2xl"></div>
                  </div>

                  {/* Screen */}
                  <div className="bg-gray-100 px-4 py-6 h-[500px] overflow-y-auto">
                    {/* Header */}
                    <div className="text-center mb-4">
                      <p className="text-xs text-gray-500">Today 9:00 AM</p>
                    </div>

                    {/* Messages */}
                    <div className="space-y-4">
                      {/* AI Message */}
                      <div className="flex justify-start">
                        <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-[85%]">
                          <p className="text-sm text-gray-900">
                            Hey! Quick weekly check-in: What was your biggest win
                            this week?
                          </p>
                        </div>
                      </div>

                      {/* User Message */}
                      <div className="flex justify-end">
                        <div className="bg-[#ff6a1a] rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm max-w-[85%]">
                          <p className="text-sm text-white">
                            Closed our first enterprise deal!
                          </p>
                        </div>
                      </div>

                      {/* AI Follow-up */}
                      <div className="flex justify-start">
                        <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-[85%]">
                          <p className="text-sm text-gray-900">
                            Amazing! 🎉 What's blocking you right now?
                          </p>
                        </div>
                      </div>

                      {/* User Response */}
                      <div className="flex justify-end">
                        <div className="bg-[#ff6a1a] rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm max-w-[85%]">
                          <p className="text-sm text-white">
                            Need to hire 2 more engineers to scale
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Home indicator */}
                  <div className="h-8 bg-black flex items-center justify-center">
                    <div className="w-32 h-1 bg-gray-700 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Configure Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Settings className="w-5 h-5 text-gray-700" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Configuration
                </h2>
              </div>

              <div className="space-y-6">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Enable Check-ins</p>
                    <p className="text-sm text-gray-600">
                      Receive weekly SMS check-ins
                    </p>
                  </div>
                  <button
                    onClick={() => setEnabled(!enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      enabled ? 'bg-[#ff6a1a]' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Frequency Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Check-in Frequency
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setFrequency('weekly')}
                      className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                        frequency === 'weekly'
                          ? 'border-[#ff6a1a] bg-orange-50 text-[#ff6a1a]'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Weekly
                    </button>
                    <button
                      onClick={() => setFrequency('bi-weekly')}
                      className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                        frequency === 'bi-weekly'
                          ? 'border-[#ff6a1a] bg-orange-50 text-[#ff6a1a]'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Bi-weekly
                    </button>
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    <MessageSquare className="w-4 h-4 inline mr-1" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff6a1a] focus:border-transparent outline-none transition-all"
                  />
                </div>

                {/* Notification Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    <Bell className="w-4 h-4 inline mr-1" />
                    Notification Time
                  </label>
                  <input
                    type="time"
                    value={notificationTime}
                    onChange={(e) => setNotificationTime(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff6a1a] focus:border-transparent outline-none transition-all"
                  />
                </div>

                {/* Save Button */}
                <button className="w-full bg-[#ff6a1a] text-white font-semibold py-3 rounded-lg hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200">
                  Save Configuration
                </button>
              </div>
            </div>

            {/* Recent Check-ins */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Recent Check-ins
              </h2>
              <div className="space-y-4">
                {recentCheckIns.map((checkIn, index) => (
                  <div
                    key={index}
                    className="border-l-4 border-[#ff6a1a] bg-gray-50 rounded-r-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(checkIn.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      {checkIn.responded && (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{checkIn.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
