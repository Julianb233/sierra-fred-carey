'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  FileText,
  Target,
  TrendingUp,
  DollarSign,
  Users,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Calendar,
  Clock,
  Loader2
} from 'lucide-react';

interface DocumentType {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

interface Document {
  id: string;
  title: string;
  type: string;
  status: 'completed' | 'draft';
  generatedAt: string;
  content?: string;
  createdAt: string;
  updatedAt: string;
}

const documentTypes: DocumentType[] = [
  {
    id: 'gtm',
    title: 'Go-to-Market Strategy',
    description: 'Comprehensive market entry and growth strategy tailored to your startup',
    icon: Target,
  },
  {
    id: 'competitive',
    title: 'Competitive Analysis',
    description: 'In-depth analysis of your competitive landscape and positioning',
    icon: TrendingUp,
  },
  {
    id: 'financial',
    title: 'Financial Model',
    description: 'AI-generated financial projections and business model analysis',
    icon: DollarSign,
  },
  {
    id: 'investor',
    title: 'Investor Memo',
    description: 'Professional investment memo highlighting key metrics and opportunities',
    icon: Users,
  },
];

export default function StrategyPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [previewExpanded, setPreviewExpanded] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      const data = await response.json();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (typeId: string) => {
    setGenerating(typeId);
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: typeId })
      });
      const data = await response.json();
      if (data.success) {
        await fetchDocuments();
        toast.success('Document generated successfully!');
      } else {
        toast.error(data.error || 'Failed to generate document');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate document');
    } finally {
      setGenerating(null);
    }
  };

  const handleView = (documentId: string) => {
    setSelectedDocument(documentId);
    setPreviewExpanded(true);
  };

  const handleEdit = (documentId: string) => {
    router.push(`/documents/${documentId}`);
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setDocuments(docs => docs.filter(d => d.id !== documentId));
        toast.success('Document deleted');
        if (selectedDocument === documentId) {
          setSelectedDocument(null);
        }
      } else {
        toast.error('Failed to delete document');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">Strategy Documents</h1>
              <span className="px-3 py-1 bg-[#ff6a1a] text-white text-sm font-semibold rounded-full">
                Pro
              </span>
            </div>
            <p className="text-gray-600">
              AI-generated strategic documents tailored to your startup.
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#ff6a1a] text-white rounded-lg hover:bg-[#e55f17] transition-colors">
            <Sparkles className="w-4 h-4" />
            <span>New Document</span>
          </button>
        </div>

        {/* Document Type Selector Grid */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Generate New Document
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documentTypes.map((docType) => {
              const Icon = docType.icon;
              const isGenerating = generating === docType.id;
              return (
                <div
                  key={docType.id}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#ff6a1a] hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <Icon className="w-6 h-6 text-[#ff6a1a]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {docType.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4">
                        {docType.description}
                      </p>
                      <button
                        onClick={() => handleGenerate(docType.id)}
                        disabled={isGenerating || generating !== null}
                        className="px-4 py-2 bg-[#ff6a1a] text-white rounded-lg hover:bg-[#e55f17] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>{isGenerating ? 'Generating...' : 'Generate'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Documents Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Recent Documents
            </h2>
            {documents.length > 5 && (
              <button className="text-sm text-[#ff6a1a] hover:underline">
                View All
              </button>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#ff6a1a] animate-spin" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">No documents yet</p>
                <p className="text-sm text-gray-400">
                  Generate your first strategy document to get started
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Document
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Generated
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {doc.title}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {doc.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              doc.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {doc.status === 'completed' ? 'Completed' : 'Draft'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>{formatTimeAgo(doc.createdAt)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleView(doc.id)}
                              className="p-2 text-gray-600 hover:text-[#ff6a1a] hover:bg-orange-50 rounded-lg transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(doc.id)}
                              className="p-2 text-gray-600 hover:text-[#ff6a1a] hover:bg-orange-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(doc.id)}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Document Preview Area (Collapsed by Default) */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setPreviewExpanded(!previewExpanded)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Document Preview</span>
              {selectedDocument && (
                <span className="text-sm text-gray-500">
                  ({documents.find(d => d.id === selectedDocument)?.title})
                </span>
              )}
            </div>
            {previewExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {previewExpanded && (
            <div className="border-t border-gray-200 p-6">
              {selectedDocument ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {documents.find(d => d.id === selectedDocument)?.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {documents.find(d => d.id === selectedDocument)?.createdAt &&
                          formatTimeAgo(documents.find(d => d.id === selectedDocument)!.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="prose max-w-none">
                    <div className="text-gray-600 whitespace-pre-wrap">
                      {documents.find(d => d.id === selectedDocument)?.content ||
                        'Document preview content would appear here. This section would display the generated strategy document with formatted sections, charts, and actionable insights.'}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button className="px-4 py-2 bg-[#ff6a1a] text-white rounded-lg hover:bg-[#e55f17] transition-colors">
                      Download PDF
                    </button>
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                      Share
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">
                    Select a document from the list above to preview
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
