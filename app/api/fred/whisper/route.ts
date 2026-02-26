import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// ============================================================================
// POST /api/fred/whisper — Whisper Flow transcription endpoint
// Accepts audio blob (webm/wav/mp4), returns transcribed text via OpenAI Whisper
// ============================================================================

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB (OpenAI limit)

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Voice transcription is not configured" },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Audio file too large (max 25 MB)" },
        { status: 413 }
      );
    }

    if (audioFile.size < 100) {
      // Too small — likely empty recording
      return NextResponse.json({ text: "", duration: 0 });
    }

    const openai = new OpenAI({ apiKey });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
      response_format: "verbose_json",
    });

    return NextResponse.json({
      text: transcription.text?.trim() || "",
      duration: transcription.duration || 0,
      language: transcription.language || "en",
    });
  } catch (err) {
    console.error("[Whisper] Transcription error:", err);

    // Handle specific OpenAI errors
    if (err instanceof OpenAI.APIError) {
      if (err.status === 429) {
        return NextResponse.json(
          { error: "Too many requests. Please try again in a moment." },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}
