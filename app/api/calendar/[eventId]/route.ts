import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const patchEventSchema = z.object({
  calendarId: z.string().optional().default("primary"),
  summary: z.string().optional(),
  description: z.string().optional(),
  start: z.record(z.string(), z.any()).optional(),
  end: z.record(z.string(), z.any()).optional(),
}).passthrough();

const eventIdSchema = z.string().min(1);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await auth();
    // @ts-ignore
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;
    if (!eventIdSchema.safeParse(eventId).success) {
      return NextResponse.json({ error: "유효하지 않은 일정 ID입니다." }, { status: 400 });
    }

    const bodyRaw = await req.json().catch(() => ({}));
    const parseResult = patchEventSchema.safeParse(bodyRaw);
    if (!parseResult.success) {
      return NextResponse.json({ error: "입력 데이터 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const body = parseResult.data;
    const calendarId = body.calendarId;

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
      method: "PATCH",
      headers: {
        // @ts-ignore
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: body.summary,
        description: body.description,
        start: body.start,
        end: body.end,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[Calendar PATCH] Google API error:", errorText);
      return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Calendar PATCH] Server Error:", error);
    return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await auth();
    // @ts-ignore
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;
    if (!eventIdSchema.safeParse(eventId).success) {
      return NextResponse.json({ error: "유효하지 않은 일정 ID입니다." }, { status: 400 });
    }

    const url = new URL(req.url);
    const calendarId = z.string().safeParse(url.searchParams.get("calendarId") || "primary").data || "primary";

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
      method: "DELETE",
      headers: {
        // @ts-ignore
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[Calendar DELETE] Google API error:", errorText);
      return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: res.status });
    }

    // DELETE on success typically returns empty response (204 No Content)
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Calendar DELETE] Server Error:", error);
    return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
  }
}
