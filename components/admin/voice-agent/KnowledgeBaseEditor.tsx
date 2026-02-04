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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, HelpCircle, FileText, Package, Search } from 'lucide-react';

interface KnowledgeEntry {
  id: string;
  entry_type: 'faq' | 'document' | 'product' | 'custom';
  question?: string;
  answer?: string;
  document_title?: string;
  document_content?: string;
  document_url?: string;
  product_name?: string;
  product_description?: string;
  product_price?: number;
  product_features?: string[];
  category: string;
  tags?: string[];
  is_active: boolean;
  priority: number;
}

interface KnowledgeBaseEditorProps {
  entries: KnowledgeEntry[];
  configId: string;
  onSave: (entry: KnowledgeEntry) => Promise<void>;
  onDelete: (entryId: string) => Promise<void>;
}

const ENTRY_TYPES = [
  { id: 'faq', name: 'FAQ', icon: HelpCircle, description: 'Question and answer pairs' },
  { id: 'document', name: 'Document', icon: FileText, description: 'Documents and guides' },
  { id: 'product', name: 'Product/Service', icon: Package, description: 'Product information' },
];

const CATEGORIES = ['General', 'Services', 'Pricing', 'Support', 'Process', 'FAQ', 'Policies'];

const emptyEntry: Omit<KnowledgeEntry, 'id'> = {
  entry_type: 'faq',
  question: '',
  answer: '',
  category: 'General',
  tags: [],
  is_active: true,
  priority: 0,
};

export function KnowledgeBaseEditor({ entries, configId, onSave, onDelete }: KnowledgeBaseEditorProps) {
  const [editingEntry, setEditingEntry] = useState<Partial<KnowledgeEntry> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [tagInput, setTagInput] = useState('');
  const [featureInput, setFeatureInput] = useState('');

  const handleSave = async () => {
    if (!editingEntry) return;
    setSaving(true);
    try {
      await onSave({ ...editingEntry, config_id: configId } as KnowledgeEntry);
      setIsDialogOpen(false);
      setEditingEntry(null);
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && editingEntry) {
      const tags = editingEntry.tags || [];
      if (!tags.includes(tagInput.trim())) {
        setEditingEntry({
          ...editingEntry,
          tags: [...tags, tagInput.trim()],
        });
      }
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    if (editingEntry) {
      setEditingEntry({
        ...editingEntry,
        tags: (editingEntry.tags || []).filter(t => t !== tag),
      });
    }
  };

  const addFeature = () => {
    if (featureInput.trim() && editingEntry) {
      const features = editingEntry.product_features || [];
      if (!features.includes(featureInput.trim())) {
        setEditingEntry({
          ...editingEntry,
          product_features: [...features, featureInput.trim()],
        });
      }
      setFeatureInput('');
    }
  };

  const removeFeature = (feature: string) => {
    if (editingEntry) {
      setEditingEntry({
        ...editingEntry,
        product_features: (editingEntry.product_features || []).filter(f => f !== feature),
      });
    }
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = searchTerm === '' ||
      entry.question?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.answer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.document_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.product_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || entry.entry_type === filterType;

    return matchesSearch && matchesType;
  });

  const getEntryIcon = (type: string) => {
    const entry = ENTRY_TYPES.find(t => t.id === type);
    return entry?.icon || HelpCircle;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search knowledge base..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {ENTRY_TYPES.map((type) => (
                <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingEntry(emptyEntry)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEntry?.id ? 'Edit Knowledge Entry' : 'New Knowledge Entry'}
              </DialogTitle>
              <DialogDescription>
                Add information for your AI agent to reference
              </DialogDescription>
            </DialogHeader>

            {editingEntry && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Entry Type</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {ENTRY_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <div
                          key={type.id}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            editingEntry.entry_type === type.id
                              ? 'border-primary bg-primary/5'
                              : 'border-muted hover:border-primary/50'
                          }`}
                          onClick={() => setEditingEntry({ ...editingEntry, entry_type: type.id as KnowledgeEntry['entry_type'] })}
                        >
                          <Icon className="h-5 w-5 mb-1" />
                          <p className="font-medium text-sm">{type.name}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* FAQ Fields */}
                {editingEntry.entry_type === 'faq' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="question">Question</Label>
                      <Input
                        id="question"
                        value={editingEntry.question || ''}
                        onChange={(e) => setEditingEntry({ ...editingEntry, question: e.target.value })}
                        placeholder="What question does this answer?"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="answer">Answer</Label>
                      <Textarea
                        id="answer"
                        value={editingEntry.answer || ''}
                        onChange={(e) => setEditingEntry({ ...editingEntry, answer: e.target.value })}
                        placeholder="The answer to provide"
                        rows={4}
                      />
                    </div>
                  </>
                )}

                {/* Document Fields */}
                {editingEntry.entry_type === 'document' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="doc_title">Document Title</Label>
                      <Input
                        id="doc_title"
                        value={editingEntry.document_title || ''}
                        onChange={(e) => setEditingEntry({ ...editingEntry, document_title: e.target.value })}
                        placeholder="Title of the document"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doc_content">Document Content</Label>
                      <Textarea
                        id="doc_content"
                        value={editingEntry.document_content || ''}
                        onChange={(e) => setEditingEntry({ ...editingEntry, document_content: e.target.value })}
                        placeholder="Content or summary"
                        rows={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doc_url">Document URL (optional)</Label>
                      <Input
                        id="doc_url"
                        value={editingEntry.document_url || ''}
                        onChange={(e) => setEditingEntry({ ...editingEntry, document_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                  </>
                )}

                {/* Product Fields */}
                {editingEntry.entry_type === 'product' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="product_name">Product/Service Name</Label>
                        <Input
                          id="product_name"
                          value={editingEntry.product_name || ''}
                          onChange={(e) => setEditingEntry({ ...editingEntry, product_name: e.target.value })}
                          placeholder="Product name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="product_price">Price</Label>
                        <Input
                          id="product_price"
                          type="number"
                          value={editingEntry.product_price || ''}
                          onChange={(e) => setEditingEntry({ ...editingEntry, product_price: parseFloat(e.target.value) })}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product_description">Description</Label>
                      <Textarea
                        id="product_description"
                        value={editingEntry.product_description || ''}
                        onChange={(e) => setEditingEntry({ ...editingEntry, product_description: e.target.value })}
                        placeholder="Product description"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Features</Label>
                      <div className="flex gap-2">
                        <Input
                          value={featureInput}
                          onChange={(e) => setFeatureInput(e.target.value)}
                          placeholder="Add a feature"
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                        />
                        <Button type="button" onClick={addFeature}>Add</Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(editingEntry.product_features || []).map((feature) => (
                          <Badge
                            key={feature}
                            variant="secondary"
                            className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => removeFeature(feature)}
                          >
                            {feature} ×
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Common Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={editingEntry.category}
                      onValueChange={(value) => setEditingEntry({ ...editingEntry, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={editingEntry.priority}
                      onChange={(e) => setEditingEntry({ ...editingEntry, priority: parseInt(e.target.value) })}
                      min={0}
                      max={100}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Add a tag"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" onClick={addTag}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(editingEntry.tags || []).map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeTag(tag)}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Entry'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Entries by Type */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All ({entries.length})</TabsTrigger>
          <TabsTrigger value="faq">FAQs ({entries.filter(e => e.entry_type === 'faq').length})</TabsTrigger>
          <TabsTrigger value="product">Products ({entries.filter(e => e.entry_type === 'product').length})</TabsTrigger>
          <TabsTrigger value="document">Documents ({entries.filter(e => e.entry_type === 'document').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3 mt-4">
          {filteredEntries.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No entries found. Add knowledge base entries for your agent to reference.
              </CardContent>
            </Card>
          ) : (
            filteredEntries.map((entry) => {
              const Icon = getEntryIcon(entry.entry_type);
              return (
                <Card key={entry.id}>
                  <CardHeader className="py-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <CardTitle className="text-base">
                            {entry.entry_type === 'faq' && entry.question}
                            {entry.entry_type === 'document' && entry.document_title}
                            {entry.entry_type === 'product' && entry.product_name}
                          </CardTitle>
                          <CardDescription className="text-sm mt-1 line-clamp-2">
                            {entry.entry_type === 'faq' && entry.answer}
                            {entry.entry_type === 'document' && entry.document_content}
                            {entry.entry_type === 'product' && (
                              <>
                                ${entry.product_price?.toFixed(2)} - {entry.product_description}
                              </>
                            )}
                          </CardDescription>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{entry.category}</Badge>
                            {entry.tags?.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingEntry(entry);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(entry.id)}
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
        </TabsContent>

        {/* Other tabs filter by type */}
        {['faq', 'product', 'document'].map((type) => (
          <TabsContent key={type} value={type} className="space-y-3 mt-4">
            {filteredEntries.filter(e => e.entry_type === type).map((entry) => {
              const Icon = getEntryIcon(entry.entry_type);
              return (
                <Card key={entry.id}>
                  <CardHeader className="py-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <CardTitle className="text-base">
                            {entry.entry_type === 'faq' && entry.question}
                            {entry.entry_type === 'document' && entry.document_title}
                            {entry.entry_type === 'product' && entry.product_name}
                          </CardTitle>
                          <CardDescription className="text-sm mt-1 line-clamp-2">
                            {entry.entry_type === 'faq' && entry.answer}
                            {entry.entry_type === 'document' && entry.document_content}
                            {entry.entry_type === 'product' && (
                              <>
                                ${entry.product_price?.toFixed(2)} - {entry.product_description}
                              </>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingEntry(entry);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(entry.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
