'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, AlertTriangle, Clock, MessageSquare, ArrowUpRight } from 'lucide-react';

interface EscalationRule {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  priority: number;
  trigger_type: 'keyword' | 'sentiment' | 'time_limit' | 'intent' | 'custom';
  trigger_keywords?: string[];
  sentiment_threshold?: number;
  time_limit_seconds?: number;
  trigger_intents?: string[];
  action: 'offer_transfer' | 'auto_transfer' | 'schedule_callback' | 'send_email';
  transfer_to?: string;
  action_message: string;
}

interface EscalationRuleEditorProps {
  rules: EscalationRule[];
  configId: string;
  onSave: (rule: EscalationRule) => Promise<void>;
  onDelete: (ruleId: string) => Promise<void>;
}

const TRIGGER_TYPES = [
  { id: 'keyword', name: 'Keyword', icon: MessageSquare, description: 'Trigger on specific words' },
  { id: 'sentiment', name: 'Sentiment', icon: AlertTriangle, description: 'Trigger on negative emotion' },
  { id: 'time_limit', name: 'Time Limit', icon: Clock, description: 'Trigger after duration' },
  { id: 'intent', name: 'Intent', icon: ArrowUpRight, description: 'Trigger on detected intent' },
];

const ACTIONS = [
  { id: 'offer_transfer', name: 'Offer Transfer', description: 'Ask if they want to speak to a human' },
  { id: 'auto_transfer', name: 'Auto Transfer', description: 'Automatically transfer to human' },
  { id: 'schedule_callback', name: 'Schedule Callback', description: 'Offer to schedule a callback' },
  { id: 'send_email', name: 'Send Email', description: 'Send escalation email' },
];

const emptyRule: Omit<EscalationRule, 'id'> = {
  name: '',
  description: '',
  is_active: true,
  priority: 50,
  trigger_type: 'keyword',
  trigger_keywords: [],
  action: 'offer_transfer',
  action_message: 'Would you like me to connect you with a team member?',
};

export function EscalationRuleEditor({ rules, configId, onSave, onDelete }: EscalationRuleEditorProps) {
  const [editingRule, setEditingRule] = useState<Partial<EscalationRule> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');

  const handleSave = async () => {
    if (!editingRule) return;
    setSaving(true);
    try {
      await onSave({ ...editingRule, config_id: configId } as EscalationRule);
      setIsDialogOpen(false);
      setEditingRule(null);
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = () => {
    if (keywordInput.trim() && editingRule) {
      const keywords = editingRule.trigger_keywords || [];
      if (!keywords.includes(keywordInput.trim())) {
        setEditingRule({
          ...editingRule,
          trigger_keywords: [...keywords, keywordInput.trim()],
        });
      }
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    if (editingRule) {
      setEditingRule({
        ...editingRule,
        trigger_keywords: (editingRule.trigger_keywords || []).filter(k => k !== keyword),
      });
    }
  };

  const getTriggerIcon = (type: string) => {
    const trigger = TRIGGER_TYPES.find(t => t.id === type);
    return trigger?.icon || MessageSquare;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Escalation Rules</h3>
          <p className="text-sm text-muted-foreground">
            Define when calls should be transferred to human agents
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingRule(emptyRule)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRule?.id ? 'Edit Escalation Rule' : 'New Escalation Rule'}
              </DialogTitle>
              <DialogDescription>
                Configure when and how to escalate calls to human agents
              </DialogDescription>
            </DialogHeader>

            {editingRule && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rule-name">Rule Name</Label>
                    <Input
                      id="rule-name"
                      value={editingRule.name}
                      onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                      placeholder="e.g., Complaint Handling"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority (0-100)</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={editingRule.priority}
                      onChange={(e) => setEditingRule({ ...editingRule, priority: parseInt(e.target.value) })}
                      min={0}
                      max={100}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Trigger Type</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {TRIGGER_TYPES.map((trigger) => {
                      const Icon = trigger.icon;
                      return (
                        <div
                          key={trigger.id}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            editingRule.trigger_type === trigger.id
                              ? 'border-primary bg-primary/5'
                              : 'border-muted hover:border-primary/50'
                          }`}
                          onClick={() => setEditingRule({ ...editingRule, trigger_type: trigger.id as EscalationRule['trigger_type'] })}
                        >
                          <Icon className="h-5 w-5 mb-1" />
                          <p className="font-medium text-sm">{trigger.name}</p>
                          <p className="text-xs text-muted-foreground">{trigger.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Trigger-specific fields */}
                {editingRule.trigger_type === 'keyword' && (
                  <div className="space-y-2">
                    <Label>Trigger Keywords</Label>
                    <div className="flex gap-2">
                      <Input
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        placeholder="Enter keyword"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                      />
                      <Button type="button" onClick={addKeyword}>Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(editingRule.trigger_keywords || []).map((keyword) => (
                        <Badge
                          key={keyword}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => removeKeyword(keyword)}
                        >
                          {keyword} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {editingRule.trigger_type === 'sentiment' && (
                  <div className="space-y-2">
                    <Label htmlFor="sentiment">Sentiment Threshold (0-100)</Label>
                    <Input
                      id="sentiment"
                      type="number"
                      value={editingRule.sentiment_threshold || 30}
                      onChange={(e) => setEditingRule({ ...editingRule, sentiment_threshold: parseInt(e.target.value) })}
                      min={0}
                      max={100}
                    />
                    <p className="text-xs text-muted-foreground">
                      Escalate when sentiment score falls below this value (0 = very negative, 100 = very positive)
                    </p>
                  </div>
                )}

                {editingRule.trigger_type === 'time_limit' && (
                  <div className="space-y-2">
                    <Label htmlFor="time_limit">Time Limit (seconds)</Label>
                    <Input
                      id="time_limit"
                      type="number"
                      value={editingRule.time_limit_seconds || 300}
                      onChange={(e) => setEditingRule({ ...editingRule, time_limit_seconds: parseInt(e.target.value) })}
                      min={30}
                      max={3600}
                    />
                    <p className="text-xs text-muted-foreground">
                      Escalate after this many seconds of conversation
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Escalation Action</Label>
                  <Select
                    value={editingRule.action}
                    onValueChange={(value) => setEditingRule({ ...editingRule, action: value as EscalationRule['action'] })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIONS.map((action) => (
                        <SelectItem key={action.id} value={action.id}>
                          {action.name} - {action.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="action_message">Escalation Message</Label>
                  <Textarea
                    id="action_message"
                    value={editingRule.action_message}
                    onChange={(e) => setEditingRule({ ...editingRule, action_message: e.target.value })}
                    placeholder="Would you like me to connect you with a team member?"
                    rows={2}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={editingRule.is_active}
                    onCheckedChange={(checked) => setEditingRule({ ...editingRule, is_active: checked })}
                  />
                  <Label htmlFor="active">Rule Active</Label>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !editingRule?.name}>
                {saving ? 'Saving...' : 'Save Rule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {rules.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No escalation rules configured. Add a rule to define when calls should be transferred.
            </CardContent>
          </Card>
        ) : (
          rules.sort((a, b) => b.priority - a.priority).map((rule) => {
            const TriggerIcon = getTriggerIcon(rule.trigger_type);
            return (
              <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TriggerIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {rule.name}
                          <Badge variant="outline" className="text-xs">
                            Priority: {rule.priority}
                          </Badge>
                          {!rule.is_active && (
                            <Badge variant="secondary" className="text-xs">
                              Disabled
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {rule.trigger_type === 'keyword' && (
                            <>Keywords: {rule.trigger_keywords?.join(', ')}</>
                          )}
                          {rule.trigger_type === 'sentiment' && (
                            <>Sentiment below {rule.sentiment_threshold}%</>
                          )}
                          {rule.trigger_type === 'time_limit' && (
                            <>After {rule.time_limit_seconds} seconds</>
                          )}
                          <span className="mx-2">→</span>
                          {ACTIONS.find(a => a.id === rule.action)?.name}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingRule(rule);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(rule.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
