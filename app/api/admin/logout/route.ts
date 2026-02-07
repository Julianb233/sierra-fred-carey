import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { revokeAdminSession } from "@/lib/auth/admin-sessions";

export async function POST() {
  try {
    const cookieStore = await cookies();

    // Revoke session token if present
    const sessionToken = cookieStore.get("adminSession")?.value;
    if (sessionToken) {
      revokeAdminSession(sessionToken);
    }

    // Clear the session cookie
    cookieStore.delete("adminSession");

    return NextResponse.json(
      { success: true, redirect: "/admin/login" },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Admin logout error:", error);
    return NextResponse.json(
      { error: "An error occurred during logout" },
      { status: 500 }
    );
  }
}
