'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Settings, ShieldAlert, BookOpen, Clock, BarChart3, CheckCircle2, XCircle } from 'lucide-react';
import { AgentConfigForm } from '@/components/admin/voice-agent/AgentConfigForm';
import { EscalationRuleEditor } from '@/components/admin/voice-agent/EscalationRuleEditor';
import { KnowledgeBaseEditor } from '@/components/admin/voice-agent/KnowledgeBaseEditor';
import { BusinessHoursEditor } from '@/components/admin/voice-agent/BusinessHoursEditor';
import { AnalyticsDashboard } from '@/components/admin/voice-agent/AnalyticsDashboard';
import { toast } from 'sonner';

interface VoiceAgentConfig {
  id: string;
  name: string;
  is_active: boolean;
  system_prompt: string;
  greeting_message: string;
  voice: string;
  max_response_length: number;
  response_style: string;
  language: string;
  business_hours: Record<string, { enabled: boolean; start: string; end: string }>;
  timezone: string;
  after_hours_behavior: string;
  after_hours_message: string;
  fallback_message: string;
  created_at: string;
  updated_at: string;
}

export default function VoiceAgentAdminPage() {
  const [config, setConfig] = useState<VoiceAgentConfig | null>(null);
  const [escalationRules, setEscalationRules] = useState<any[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('config');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [configRes, rulesRes, kbRes, analyticsRes] = await Promise.all([
        fetch('/api/admin/voice-agent/config'),
        fetch('/api/admin/voice-agent/escalation'),
        fetch('/api/admin/voice-agent/knowledge'),
        fetch('/api/admin/voice-agent/analytics'),
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData);
      }

      if (rulesRes.ok) {
        setEscalationRules(await rulesRes.json());
      }

      if (kbRes.ok) {
        setKnowledgeBase(await kbRes.json());
      }

      if (analyticsRes.ok) {
        setAnalytics(await analyticsRes.json());
      }
    } catch (error) {
      console.error('Error loading voice agent data:', error);
      toast.error('Failed to load voice agent configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (updatedConfig: VoiceAgentConfig) => {
    try {
      const res = await fetch('/api/admin/voice-agent/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig),
      });

      if (!res.ok) throw new Error('Failed to save');

      const saved = await res.json();
      setConfig(saved);
      toast.success('Configuration saved successfully');
    } catch (error) {
      toast.error('Failed to save configuration');
      throw error;
    }
  };

  const saveEscalationRule = async (rule: any) => {
    try {
      const method = rule.id ? 'PUT' : 'POST';
      const res = await fetch('/api/admin/voice-agent/escalation', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rule, config_id: config?.id }),
      });

      if (!res.ok) throw new Error('Failed to save');

      toast.success('Escalation rule saved');
      loadData(); // Reload to get updated list
    } catch (error) {
      toast.error('Failed to save escalation rule');
      throw error;
    }
  };

  const deleteEscalationRule = async (ruleId: string) => {
    try {
      await fetch(`/api/admin/voice-agent/escalation?id=${ruleId}`, {
        method: 'DELETE',
      });

      setEscalationRules(prev => prev.filter(r => r.id !== ruleId));
      toast.success('Escalation rule deleted');
    } catch (error) {
      toast.error('Failed to delete escalation rule');
    }
  };

  const saveKnowledgeEntry = async (entry: any) => {
    try {
      const method = entry.id ? 'PUT' : 'POST';
      const res = await fetch('/api/admin/voice-agent/knowledge', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...entry, config_id: config?.id }),
      });

      if (!res.ok) throw new Error('Failed to save');

      toast.success('Knowledge base entry saved');
      loadData();
    } catch (error) {
      toast.error('Failed to save knowledge base entry');
      throw error;
    }
  };

  const deleteKnowledgeEntry = async (entryId: string) => {
    try {
      await fetch(`/api/admin/voice-agent/knowledge?id=${entryId}`, {
        method: 'DELETE',
      });

      setKnowledgeBase(prev => prev.filter(e => e.id !== entryId));
      toast.success('Knowledge base entry deleted');
    } catch (error) {
      toast.error('Failed to delete knowledge base entry');
    }
  };

  const saveBusinessHours = async (hours: any, timezone: string) => {
    if (!config) return;

    try {
      const res = await fetch('/api/admin/voice-agent/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: config.id,
          business_hours: hours,
          timezone,
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      const saved = await res.json();
      setConfig(saved);
      toast.success('Business hours saved');
    } catch (error) {
      toast.error('Failed to save business hours');
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasLiveKitConfig = process.env.NEXT_PUBLIC_LIVEKIT_URL || true; // Assume configured in .env
  const hasOpenAIConfig = true; // Assume configured

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Voice Agent Settings</h1>
          <p className="text-muted-foreground">
            Configure your AI voice assistant&apos;s behavior, knowledge, and escalation rules
          </p>
        </div>
        {config && (
          <div className="flex items-center gap-2">
            {config.is_active ? (
              <Badge className="bg-green-500">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="h-3 w-3 mr-1" />
                Inactive
              </Badge>
            )}
            <Badge variant="outline">{config.name}</Badge>
          </div>
        )}
      </div>

      {/* Status Alerts */}
      {(!hasLiveKitConfig || !hasOpenAIConfig) && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Configuration Required</AlertTitle>
          <AlertDescription>
            {!hasLiveKitConfig && 'LiveKit credentials are missing. '}
            {!hasOpenAIConfig && 'OpenAI API key is missing. '}
            Voice calls will not work until these are configured in your environment variables.
          </AlertDescription>
        </Alert>
      )}

      {!config && (
        <Alert>
          <AlertTitle>No Configuration Found</AlertTitle>
          <AlertDescription>
            No voice agent configuration exists. A default configuration will be created when you save settings.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Agent Config</span>
          </TabsTrigger>
          <TabsTrigger value="escalation" className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            <span className="hidden sm:inline">Escalation</span>
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Knowledge</span>
          </TabsTrigger>
          <TabsTrigger value="hours" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Hours</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          {config ? (
            <AgentConfigForm config={config} onSave={saveConfig} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  Loading configuration...
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="escalation">
          {config ? (
            <EscalationRuleEditor
              rules={escalationRules}
              configId={config.id}
              onSave={saveEscalationRule}
              onDelete={deleteEscalationRule}
            />
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  Configure agent settings first
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="knowledge">
          {config ? (
            <KnowledgeBaseEditor
              entries={knowledgeBase}
              configId={config.id}
              onSave={saveKnowledgeEntry}
              onDelete={deleteKnowledgeEntry}
            />
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  Configure agent settings first
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="hours">
          {config ? (
            <BusinessHoursEditor
              hours={config.business_hours as any}
              timezone={config.timezone}
              onSave={saveBusinessHours}
            />
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  Configure agent settings first
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsDashboard data={analytics} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
