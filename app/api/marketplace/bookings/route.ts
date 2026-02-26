import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBooking, getUserBookings } from "@/lib/db/marketplace";

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const bookings = await getUserBookings(user.id);
    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("[marketplace/bookings] getUserBookings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).providerId !== "string"
  ) {
    return NextResponse.json(
      { error: "providerId is required" },
      { status: 400 }
    );
  }

  const input = body as {
    providerId: string;
    listingId?: string;
    message?: string;
    amountCents?: number;
  };

  try {
    const booking = await createBooking(user.id, {
      providerId: input.providerId,
      listingId: input.listingId,
      message: input.message,
      amountCents: input.amountCents,
    });
    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error("[marketplace/bookings] createBooking error:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
