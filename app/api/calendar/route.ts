import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import dns from "dns";

// Fix Node.js 18+ Windows IPv6 resolution issue which causes 5+ seconds delay
dns.setDefaultResultOrder('ipv4first');

const querySchema = z.object({
  timeMin: z.string().nullable(),
  timeMax: z.string().nullable(),
  calendarIds: z.string().nullable(),
});

const postEventSchema = z.object({
  calendarId: z.string().optional().default("primary"),
  summary: z.string().min(1, "제목은 필수 항목입니다."),
  description: z.string().optional(),
  start: z.record(z.string(), z.any()),
  end: z.record(z.string(), z.any()).optional(),
}).passthrough();

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    // @ts-ignore
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const parseResult = querySchema.safeParse({
      timeMin: searchParams.get("timeMin"),
      timeMax: searchParams.get("timeMax"),
      calendarIds: searchParams.get("calendarIds"),
    });

    if (!parseResult.success) {
      return NextResponse.json({ error: "잘못된 요청 파리미터입니다." }, { status: 400 });
    }

    const { timeMin, timeMax, calendarIds: calendarIdsParam } = parseResult.data;
    const calendarIds = calendarIdsParam ? calendarIdsParam.split(",") : ["primary"];
    const holidayId = "ko.south_korea#holiday@group.v.calendar.google.com";

    const startTime = Date.now();
    console.log(`[Sync] Starting Google Calendar fetch for timeMin: ${timeMin}, timeMax: ${timeMax}`);

    const buildUrl = (calId: string) => {
      let url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?singleEvents=true&orderBy=startTime&maxResults=250`;
      if (timeMin) url += `&timeMin=${encodeURIComponent(timeMin)}`;
      if (timeMax) url += `&timeMax=${encodeURIComponent(timeMax)}`;
      return url;
    };

    const fetchCalendar = async (calId: string, isHoliday: boolean = false) => {
      try {
        const res = await fetch(buildUrl(calId), {
          headers: {
            // @ts-ignore
            Authorization: `Bearer ${session.accessToken}`,
          },
        });
        if (!res.ok) {
          console.warn(`[Sync] Failed to fetch calendar ${calId}: ${await res.text()}`);
          return [];
        }
        const data = await res.json();
        return (data.items || []).map((item: any) => ({
          ...item,
          calendarId: calId,
          isHoliday
        }));
      } catch (err) {
        console.error(`[Sync] Error fetching calendar ${calId}:`, err);
        return [];
      }
    };

    const fetchPromises = calendarIds.map(id => fetchCalendar(id));
    const holidayPromise = fetchCalendar(holidayId, true);

    const results = await Promise.all([...fetchPromises, holidayPromise]);
    
    const combinedItems = results.flat();

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`[Sync] Google API fetch completed in ${duration}ms. Total events: ${combinedItems.length}`);

    // Return the items combined under a single structure
    return NextResponse.json({ items: combinedItems });
  } catch (error: any) {
    console.error("[Sync] Internal Server Error:", error);
    return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    // @ts-ignore
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bodyRaw = await req.json().catch(() => ({}));
    const parseResult = postEventSchema.safeParse(bodyRaw);

    if (!parseResult.success) {
      return NextResponse.json({ error: "입력 데이터 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const body = parseResult.data;
    const calendarId = body.calendarId;

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: "POST",
      headers: {
        // @ts-ignore
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[Calendar POST] Google API error:", errorText);
      return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Calendar POST] Server Error:", error);
    return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
  }
}
