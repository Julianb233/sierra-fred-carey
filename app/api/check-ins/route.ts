import { NextResponse } from "next/server";

// Mock data
const mockCheckIns = [
  {
    id: "1",
    userId: "user_123",
    date: "2024-12-30",
    time: "09:00",
    type: "motivation",
    status: "pending",
    createdAt: "2024-12-23T00:00:00Z",
  },
  {
    id: "2",
    userId: "user_123",
    date: "2024-12-23",
    time: "09:00",
    type: "progress",
    status: "completed",
    response:
      "Made great progress on Q1 planning. Team aligned on priorities and ready to execute.",
    createdAt: "2024-12-16T00:00:00Z",
    completedAt: "2024-12-23T09:15:00Z",
  },
  {
    id: "3",
    userId: "user_123",
    date: "2024-12-16",
    time: "09:00",
    type: "blockers",
    status: "completed",
    response:
      "Identified resource constraints. Need to hire 2 more engineers to hit targets.",
    createdAt: "2024-12-09T00:00:00Z",
    completedAt: "2024-12-16T09:30:00Z",
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  const checkIns = userId
    ? mockCheckIns.filter((ci) => ci.userId === userId)
    : mockCheckIns;

  return NextResponse.json({
    success: true,
    data: checkIns,
    total: checkIns.length,
  });
}

export async function POST(request: Request) {
  const body = await request.json();

  const newCheckIn = {
    id: `${Date.now()}`,
    userId: body.userId || "user_123",
    date: body.date,
    time: body.time,
    type: body.type,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  mockCheckIns.push(newCheckIn);

  return NextResponse.json(
    {
      success: true,
      data: newCheckIn,
      message: "Check-in scheduled successfully",
    },
    { status: 201 }
  );
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, response, status } = body;

  const checkInIndex = mockCheckIns.findIndex((ci) => ci.id === id);

  if (checkInIndex === -1) {
    return NextResponse.json(
      { success: false, error: "Check-in not found" },
      { status: 404 }
    );
  }

  mockCheckIns[checkInIndex] = {
    ...mockCheckIns[checkInIndex],
    response,
    status,
    completedAt: status === "completed" ? new Date().toISOString() : undefined,
  };

  return NextResponse.json({
    success: true,
    data: mockCheckIns[checkInIndex],
    message: "Check-in updated successfully",
  });
}
