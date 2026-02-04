'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, RefreshCw, Volume2 } from 'lucide-react';

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

interface AgentConfigFormProps {
  config: VoiceAgentConfig;
  onSave: (config: VoiceAgentConfig) => Promise<void>;
}

const VOICES = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced' },
  { id: 'echo', name: 'Echo', description: 'Warm and smooth' },
  { id: 'fable', name: 'Fable', description: 'British and storytelling' },
  { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
  { id: 'nova', name: 'Nova', description: 'Friendly and bright' },
  { id: 'shimmer', name: 'Shimmer', description: 'Clear and professional' },
];

const RESPONSE_STYLES = [
  { id: 'professional', name: 'Professional', description: 'Formal and business-like' },
  { id: 'friendly', name: 'Friendly', description: 'Warm and approachable' },
  { id: 'casual', name: 'Casual', description: 'Relaxed and conversational' },
];

const AFTER_HOURS_OPTIONS = [
  { id: 'voicemail', name: 'Voicemail', description: 'Take voicemail messages' },
  { id: 'limited', name: 'Limited', description: 'Basic AI responses only' },
  { id: 'offline', name: 'Offline', description: 'Completely unavailable' },
];

export function AgentConfigForm({ config, onSave }: AgentConfigFormProps) {
  const [formData, setFormData] = useState<VoiceAgentConfig>(config);
  const [saving, setSaving] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  const handleChange = (field: keyof VoiceAgentConfig, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  const previewVoice = async (voiceId: string) => {
    setPreviewingVoice(voiceId);
    // In production, this would call OpenAI TTS API to preview the voice
    // For now, just simulate a preview
    setTimeout(() => setPreviewingVoice(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Agent Identity */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Identity</CardTitle>
          <CardDescription>Configure how your AI agent introduces itself</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Agent Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Support Agent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={formData.language}
                onValueChange={(value) => handleChange('language', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="greeting">Greeting Message</Label>
            <Textarea
              id="greeting"
              value={formData.greeting_message}
              onChange={(e) => handleChange('greeting_message', e.target.value)}
              placeholder="Hello! Thank you for calling..."
              rows={2}
            />
            <p className="text-sm text-muted-foreground">
              The first message the agent says when answering a call
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="system_prompt">System Prompt</Label>
            <Textarea
              id="system_prompt"
              value={formData.system_prompt}
              onChange={(e) => handleChange('system_prompt', e.target.value)}
              placeholder="You are a helpful AI assistant..."
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              Instructions that define how your agent behaves and responds
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Voice Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Settings</CardTitle>
          <CardDescription>Choose how your agent sounds</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {VOICES.map((voice) => (
              <div
                key={voice.id}
                className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.voice === voice.id
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-primary/50'
                }`}
                onClick={() => handleChange('voice', voice.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{voice.name}</p>
                    <p className="text-xs text-muted-foreground">{voice.description}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      previewVoice(voice.id);
                    }}
                  >
                    <Volume2 className={`h-4 w-4 ${previewingVoice === voice.id ? 'animate-pulse text-primary' : ''}`} />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="response_style">Response Style</Label>
              <Select
                value={formData.response_style}
                onValueChange={(value) => handleChange('response_style', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  {RESPONSE_STYLES.map((style) => (
                    <SelectItem key={style.id} value={style.id}>
                      <div>
                        <span>{style.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          - {style.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_response_length">Max Response Length (words)</Label>
              <Input
                id="max_response_length"
                type="number"
                value={formData.max_response_length}
                onChange={(e) => handleChange('max_response_length', parseInt(e.target.value))}
                min={50}
                max={500}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* After Hours */}
      <Card>
        <CardHeader>
          <CardTitle>After Hours Behavior</CardTitle>
          <CardDescription>What happens when calls come in outside business hours</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="after_hours_behavior">Behavior</Label>
              <Select
                value={formData.after_hours_behavior}
                onValueChange={(value) => handleChange('after_hours_behavior', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select behavior" />
                </SelectTrigger>
                <SelectContent>
                  {AFTER_HOURS_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name} - {option.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => handleChange('timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Chicago">Central Time</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="after_hours_message">After Hours Message</Label>
            <Textarea
              id="after_hours_message"
              value={formData.after_hours_message}
              onChange={(e) => handleChange('after_hours_message', e.target.value)}
              placeholder="Our office is currently closed..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Fallback */}
      <Card>
        <CardHeader>
          <CardTitle>Fallback Response</CardTitle>
          <CardDescription>What to say when the agent can't help</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.fallback_message}
            onChange={(e) => handleChange('fallback_message', e.target.value)}
            placeholder="I apologize, but I'm unable to help..."
            rows={2}
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => setFormData(config)}>
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
              Save Configuration
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
