"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  Eye, 
  Plus,
  Clock,
  CheckCircle2,
  Sparkles,
  FileSpreadsheet,
  Presentation,
  Newspaper
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([
    {
      id: 1,
      title: "Startup One-Pager",
      type: "one-pager",
      status: "completed",
      createdAt: "2024-01-15",
      size: "2 pages",
      description: "Concise overview of your startup for quick introductions"
    },
    {
      id: 2,
      title: "Pitch Deck",
      type: "pitch-deck",
      status: "completed",
      createdAt: "2024-01-10",
      size: "12 slides",
      description: "Investor presentation deck with market analysis and financials"
    },
    {
      id: 3,
      title: "Financial Projections",
      type: "financials",
      status: "in-progress",
      createdAt: "2024-01-18",
      size: "5 pages",
      description: "3-year revenue and expense projections"
    },
    {
      id: 4,
      title: "Go-to-Market Strategy",
      type: "strategy",
      status: "completed",
      createdAt: "2024-01-05",
      size: "8 pages",
      description: "Detailed plan for customer acquisition and market entry"
    },
    {
      id: 5,
      title: "Product Roadmap",
      type: "roadmap",
      status: "completed",
      createdAt: "2024-01-12",
      size: "4 pages",
      description: "6-month product development timeline and milestones"
    }
  ]);

  const documentTemplates = [
    {
      type: "one-pager",
      title: "Startup One-Pager",
      description: "Single page overview of your business",
      icon: Newspaper,
      color: "bg-blue-500"
    },
    {
      type: "pitch-deck",
      title: "Investor Pitch Deck",
      description: "Professional slide deck for investors",
      icon: Presentation,
      color: "bg-purple-500"
    },
    {
      type: "financials",
      title: "Financial Model",
      description: "Revenue projections and unit economics",
      icon: FileSpreadsheet,
      color: "bg-green-500"
    },
    {
      type: "strategy",
      title: "Strategy Document",
      description: "Go-to-market and growth plans",
      icon: FileText,
      color: "bg-orange-500"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "in-progress":
        return <Badge className="bg-yellow-500">In Progress</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case "pitch-deck":
        return Presentation;
      case "financials":
        return FileSpreadsheet;
      case "one-pager":
        return Newspaper;
      default:
        return FileText;
    }
  };

  return (
    <div className="max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-8 w-8 text-blue-500" />
            <h1 className="text-3xl font-bold tracking-tight">Strategy Documents</h1>
          </div>
          <p className="text-muted-foreground">
            Create and manage your startup documents and pitch materials
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Generate New Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Generate New Document</DialogTitle>
              <DialogDescription>
                Choose a document type to generate using AI
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {documentTemplates.map((template) => (
                <Button
                  key={template.type}
                  variant="outline"
                  className="h-auto justify-start p-4"
                >
                  <div className={`${template.color} text-white p-3 rounded-md mr-4`}>
                    <template.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold">{template.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {template.description}
                    </div>
                  </div>
                  <Sparkles className="h-5 w-5 text-purple-500 ml-2" />
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Documents
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
            <p className="text-xs text-muted-foreground">
              {documents.filter(d => d.status === "completed").length} completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              In Progress
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documents.filter(d => d.status === "in-progress").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Being generated
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Last Updated
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Today</div>
            <p className="text-xs text-muted-foreground">
              Financial Projections
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Documents</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              All Types
            </Button>
            <Button variant="outline" size="sm">
              Sort by Date
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {documents.map((doc) => {
            const Icon = getDocumentIcon(doc.type);
            return (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="bg-muted p-3 rounded-lg">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{doc.title}</CardTitle>
                          {getStatusBadge(doc.status)}
                        </div>
                        <CardDescription>{doc.description}</CardDescription>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {doc.size}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                    <Button variant="outline" size="sm">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Regenerate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Help Card */}
      <Card className="bg-muted">
        <CardHeader>
          <CardTitle className="text-lg">Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Our AI-powered document generator creates professional, investor-ready materials 
            tailored to your startup. Each document is customized based on your Reality Lens 
            analysis and investor readiness score.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" size="sm">
              View Examples
            </Button>
            <Button variant="outline" size="sm">
              Document Guide
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
