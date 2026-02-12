/**
 * Document Repository API
 * Phase 44: Document Repository
 *
 * GET  /api/document-repository        — List documents (optional ?folder= filter)
 * POST /api/document-repository        — Upload file + create DB record
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  listDocuments,
  createDocument,
  uploadFile,
  suggestFolder,
  type DocumentFolder,
} from "@/lib/documents/repository";

const VALID_FOLDERS: DocumentFolder[] = ["decks", "strategy", "reports", "uploads"];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "text/plain",
  "text/markdown",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/webp",
];

/**
 * GET /api/document-repository
 * List documents, optionally filtered by folder.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();

    const { searchParams } = new URL(request.url);
    const folderParam = searchParams.get("folder") as DocumentFolder | null;

    if (folderParam && !VALID_FOLDERS.includes(folderParam)) {
      return NextResponse.json(
        { success: false, error: `Invalid folder. Must be one of: ${VALID_FOLDERS.join(", ")}` },
        { status: 400 }
      );
    }

    const documents = await listDocuments(userId, folderParam ?? undefined);

    return NextResponse.json({
      success: true,
      documents,
      total: documents.length,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[DocumentRepository GET]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/document-repository
 * Upload a file to storage and create a document record.
 *
 * Accepts multipart/form-data with:
 *   - file: File (required)
 *   - title: string (optional — defaults to file name)
 *   - description: string (optional)
 *   - folder: string (optional — auto-detected from file name if omitted)
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string) || undefined;
    const description = (formData.get("description") as string) || undefined;
    const folderParam = formData.get("folder") as DocumentFolder | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `File type "${file.type}" is not supported. Allowed: PDF, PPTX, DOCX, XLSX, TXT, MD, CSV, PNG, JPG, WebP`,
        },
        { status: 400 }
      );
    }

    // Validate folder if provided
    if (folderParam && !VALID_FOLDERS.includes(folderParam)) {
      return NextResponse.json(
        { success: false, error: `Invalid folder. Must be one of: ${VALID_FOLDERS.join(", ")}` },
        { status: 400 }
      );
    }

    // Auto-detect folder if not specified
    const folder = folderParam || suggestFolder(file.name, file.type);

    // Upload to storage
    const { publicUrl } = await uploadFile(userId, file);

    // Create database record
    const document = await createDocument(userId, {
      title: title || file.name,
      description,
      folder,
      fileUrl: publicUrl,
      fileType: file.type || null,
      fileSize: file.size,
      sourceType: "upload",
    });

    return NextResponse.json(
      {
        success: true,
        document,
        suggestedFolder: folderParam ? undefined : folder,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[DocumentRepository POST]", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload document" },
      { status: 500 }
    );
  }
}
