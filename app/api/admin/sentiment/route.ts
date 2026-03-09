import { NextRequest, NextResponse } from "next/server"
import { isAdminSession } from "@/lib/auth/admin"
import {
  getSentimentOverview,
  getInterventionLog,
  getUserSentimentHistory,
} from "@/lib/db/sentiment-admin"

export async function GET(req: NextRequest) {
  const admin = await isAdminSession()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = req.nextUrl.searchParams
  const view = url.get("view") || "overview"
  const days = url.has("days") ? Number(url.get("days")) : undefined

  try {
    switch (view) {
      case "overview": {
        const data = await getSentimentOverview(days ?? 7)
        return NextResponse.json(data)
      }
      case "interventions": {
        const limit = url.has("limit") ? Number(url.get("limit")) : 50
        const data = await getInterventionLog(limit)
        return NextResponse.json(data)
      }
      case "user-history": {
        const userId = url.get("userId")
        if (!userId) {
          return NextResponse.json({ error: "userId required" }, { status: 400 })
        }
        const data = await getUserSentimentHistory(userId, days ?? 30)
        return NextResponse.json(data)
      }
      default:
        return NextResponse.json({ error: `Unknown view: ${view}` }, { status: 400 })
    }
  } catch (error) {
    console.error("[admin/sentiment] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
