"use client";

import { useState } from "react";
import { Lock, Target, Users, Mail, TrendingUp, Database, FolderOpen, ArrowRight, Check } from "lucide-react";

export default function BoardyIntegrationPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [hasStudioPlan, setHasStudioPlan] = useState(false); // This would come from user's subscription

  const features = [
    {
      icon: Target,
      title: "Investor Matching",
      description: "AI matches you with investors who fund your stage and sector",
      color: "text-orange-500",
      bgColor: "bg-orange-50",
    },
    {
      icon: Users,
      title: "Warm Introductions",
      description: "Leverage network effects for warm intros to investors",
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      icon: Mail,
      title: "Outreach Sequences",
      description: "Automated follow-up sequences that feel personal",
      color: "text-purple-500",
      bgColor: "bg-purple-50",
    },
  ];

  const roadmapItems = [
    {
      icon: Database,
      title: "LP Database Access",
      description: "Search and filter thousands of verified LPs and VCs",
    },
    {
      icon: TrendingUp,
      title: "Fundraise Analytics",
      description: "Track engagement, open rates, and investor interest",
    },
    {
      icon: FolderOpen,
      title: "Deal Room Integration",
      description: "Share your deck and materials in secure deal rooms",
    },
  ];

  const handleConnect = () => {
    if (hasStudioPlan) {
      // Open OAuth flow or connection modal
      setIsConnected(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-3xl font-bold text-gray-900">Boardy Integration</h1>
            <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-semibold rounded-full">
              <Lock className="h-3.5 w-3.5" />
              Studio
            </div>
          </div>
          <p className="text-lg text-gray-600">
            Automated investor matching, warm intros, and outreach sequencing.
          </p>
        </div>

        {/* Connection Status Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          {isConnected ? (
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Connected to Boardy
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Account: founder@startup.com
                  </p>
                  <p className="text-sm text-gray-500">
                    Last synced: 2 hours ago
                  </p>
                </div>
              </div>
              <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Disconnect
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-orange-100 mx-auto mb-4">
                <Target className="h-8 w-8 text-[#ff6a1a]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Connect your Boardy account
              </h3>
              <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                Link your Boardy account to automatically sync investor matches, track outreach, and manage warm introductions.
              </p>
              <button
                onClick={handleConnect}
                disabled={!hasStudioPlan}
                className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg transition-all ${
                  hasStudioPlan
                    ? "bg-[#ff6a1a] text-white hover:bg-[#e55f17] shadow-lg shadow-orange-500/30"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                {hasStudioPlan ? (
                  <>
                    Connect to Boardy
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Studio Plan Required
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Features Preview Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Features
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className={`bg-white rounded-xl border-2 p-6 transition-all ${
                    hasStudioPlan
                      ? "border-gray-200 hover:border-orange-300 hover:shadow-lg cursor-pointer"
                      : "border-gray-100 opacity-60"
                  }`}
                >
                  <div className={`inline-flex items-center justify-center h-12 w-12 rounded-lg ${feature.bgColor} mb-4`}>
                    <Icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {feature.description}
                  </p>
                  {!hasStudioPlan && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                      <Lock className="h-3 w-3" />
                      Studio required
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Coming Soon Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Coming Soon
            </h2>
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
              Roadmap
            </span>
          </div>
          <div className="space-y-4">
            {roadmapItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 bg-gray-50"
                >
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-white border border-gray-200 flex-shrink-0">
                    <Icon className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA for Non-Studio Users */}
        {!hasStudioPlan && (
          <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl p-8 text-center text-white">
            <Lock className="h-12 w-12 mx-auto mb-4 opacity-90" />
            <h2 className="text-2xl font-bold mb-3">
              Upgrade to Studio to unlock Boardy
            </h2>
            <p className="text-white/90 mb-6 max-w-2xl mx-auto">
              Get access to automated investor matching, warm introductions, outreach sequences, and more. Accelerate your fundraising with AI-powered connections.
            </p>
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#ff6a1a] font-semibold rounded-lg hover:bg-gray-100 transition-all shadow-lg">
              Upgrade to Studio
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Demo Mode Toggle (for testing) */}
        <div className="mt-8 p-4 bg-gray-100 rounded-lg border border-gray-300">
          <p className="text-xs text-gray-600 mb-2 font-mono">
            Demo Controls (remove in production)
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => setHasStudioPlan(!hasStudioPlan)}
              className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Toggle Studio Plan: {hasStudioPlan ? "ON" : "OFF"}
            </button>
            <button
              onClick={() => setIsConnected(!isConnected)}
              className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
              disabled={!hasStudioPlan}
            >
              Toggle Connection: {isConnected ? "Connected" : "Disconnected"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
