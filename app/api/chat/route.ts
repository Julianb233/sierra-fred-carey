import { NextRequest, NextResponse } from "next/server";

// Mock AI responses for demonstration
const mockResponses = [
  "That's an excellent question. Based on my analysis, I would recommend focusing on your core value proposition first. Let me break down the key considerations...",
  "I understand your concern. In my experience working with founders, this is a common challenge. Here's a strategic framework you can use...",
  "Great insight! To build on that, consider these three critical factors that could impact your decision...",
  "Let me help you think through this systematically. First, let's examine the market dynamics, then we'll look at your competitive positioning...",
  "This is a pivotal decision point. I recommend a data-driven approach. Here's what the metrics suggest...",
];

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1500));

    // For now, return a mock response
    // TODO: Integrate with actual AI service (OpenAI, Claude, etc.)
    const response = mockResponses[Math.floor(Math.random() * mockResponses.length)];

    return NextResponse.json({ 
      response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
