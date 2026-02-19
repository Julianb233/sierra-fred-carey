/**
 * Twilio SMS Delivery Status Webhook
 * Phase 61: Twilio SMS Activation - Plan 01
 *
 * Receives delivery status callbacks from Twilio for outbound messages.
 * Updates check-in records with delivery status (delivered, failed, etc.).
 *
 * POST /api/sms/status
 */

import { NextRequest, NextResponse } from "next/server";
import { validateWebhook } from "@/lib/sms/client";
import { updateDeliveryStatus, getCheckinByMessageSid, updateCheckinStatus } from "@/lib/db/sms";
import { createServiceClient } from "@/lib/supabase/server";
import type { TwilioMessageStatus } from "@/lib/sms/types";

export const dynamic = "force-dynamic";

/**
 * Map Twilio delivery status to our internal SMSStatus.
 * 'delivered' -> 'delivered'
 * 'undelivered' | 'failed' -> 'failed'
 * Others are informational and don't change the main status.
 */
function mapToInternalStatus(
  twilioStatus: TwilioMessageStatus
): "delivered" | "failed" | null {
  switch (twilioStatus) {
    case "delivered":
      return "delivered";
    case "undelivered":
    case "failed":
      return "failed";
    default:
      return null; // Informational statuses (accepted, queued, sending, sent)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if Twilio is configured
    if (!process.env.TWILIO_AUTH_TOKEN) {
      console.error("[SMS Status] TWILIO_AUTH_TOKEN not configured");
      return new NextResponse("", { status: 503 });
    }

    // Parse form data (Twilio sends application/x-www-form-urlencoded)
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    // Validate Twilio signature
    const signature = request.headers.get("x-twilio-signature");
    if (!signature) {
      console.warn("[SMS Status] Missing x-twilio-signature header");
      return new NextResponse("", { status: 403 });
    }

    const statusUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/status`;
    const isValid = validateWebhook(signature, statusUrl, params);

    if (!isValid) {
      console.warn("[SMS Status] Invalid Twilio signature");
      return new NextResponse("", { status: 403 });
    }

    // Extract delivery status fields
    const messageSid = params.MessageSid;
    const messageStatus = params.MessageStatus as TwilioMessageStatus;
    const errorCode = params.ErrorCode || undefined;
    const errorMessage = params.ErrorMessage || undefined;

    if (!messageSid || !messageStatus) {
      console.warn("[SMS Status] Missing MessageSid or MessageStatus");
      return new NextResponse("", { status: 400 });
    }

    console.info(
      `[SMS Status] Delivery update: SID=${messageSid} status=${messageStatus}${
        errorCode ? ` error=${errorCode}` : ""
      }`
    );

    const supabase = createServiceClient();

    // Update the delivery status fields on the check-in record
    await updateDeliveryStatus(
      supabase,
      messageSid,
      messageStatus,
      errorCode,
      errorMessage
    );

    // Map to internal status and update the main status field if applicable
    const internalStatus = mapToInternalStatus(messageStatus);
    if (internalStatus) {
      const checkin = await getCheckinByMessageSid(supabase, messageSid);
      if (checkin) {
        await updateCheckinStatus(supabase, checkin.id, internalStatus);
      } else {
        console.warn(
          `[SMS Status] No checkin found for MessageSid=${messageSid}`
        );
      }
    }

    // Return 200 with empty body (Twilio expects 200 acknowledgment)
    return new NextResponse("", { status: 200 });
  } catch (error) {
    console.error("[SMS Status] Error processing delivery status:", error);
    // Return 200 to prevent Twilio from retrying
    return new NextResponse("", { status: 200 });
  }
}
