import { NextRequest, NextResponse } from "next/server";
import { createCustomerPortalSession } from "@/lib/stripe/server";
import { getUserSubscription } from "@/lib/db/subscriptions";

export async function POST(request: NextRequest) {
  try {
    // User ID from session cookie or header (auth integration pending)
    const userId = request.headers.get("x-user-id") ||
                   request.cookies.get("userId")?.value ||
                   "anonymous";

    const subscription = await getUserSubscription(userId);

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 404 }
      );
    }

    const baseUrl = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL;

    const session = await createCustomerPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl: `${baseUrl}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
