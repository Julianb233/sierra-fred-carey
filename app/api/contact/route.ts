import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit, createRateLimitResponse } from "@/lib/api/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 submissions per hour per IP
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0].trim() || "unknown";
    const rateLimitResult = await checkRateLimit(`contact:${ip}`, {
      limit: 5,
      windowSeconds: 3600,
    });
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const { name, email, company, message } = await request.json();

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Get request metadata
    const userAgent = request.headers.get("user-agent") || undefined;
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0].trim() || undefined;

    // Use service client for database operations
    const supabase = createServiceClient();

    // Insert contact submission
    const { data, error } = await supabase
      .from("contact_submissions")
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        company: company?.trim() || null,
        message: message.trim(),
        source: "contact_page",
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("[contact] Supabase insert error:", error);
      return NextResponse.json(
        { error: "Failed to submit contact form. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Thank you for your message. We'll get back to you soon!",
      id: data.id,
    });
  } catch (error) {
    console.error("[contact] Error:", error);

    return NextResponse.json(
      { error: "Failed to submit contact form. Please try again." },
      { status: 500 }
    );
  }
}
