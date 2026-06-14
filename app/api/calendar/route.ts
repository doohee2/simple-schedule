import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import dns from "dns";

// Fix Node.js 18+ Windows IPv6 resolution issue which causes 5+ seconds delay
dns.setDefaultResultOrder('ipv4first');

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    // @ts-ignore
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const timeMin = searchParams.get("timeMin");
    const timeMax = searchParams.get("timeMax");
    const calendarIdsParam = searchParams.get("calendarIds");
    
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
    console.error("[Sync] Internal Server Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    // @ts-ignore
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const calendarId = body.calendarId || "primary";

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
      return NextResponse.json({ error: "Google API error", details: errorText }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
