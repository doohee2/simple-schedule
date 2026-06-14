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

    let primaryUrl = "https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=250";
    let holidayUrl = "https://www.googleapis.com/calendar/v3/calendars/ko.south_korea%23holiday%40group.v.calendar.google.com/events?singleEvents=true&orderBy=startTime&maxResults=250";
    
    if (timeMin) {
      const minParam = `&timeMin=${encodeURIComponent(timeMin)}`;
      primaryUrl += minParam;
      holidayUrl += minParam;
    }
    if (timeMax) {
      const maxParam = `&timeMax=${encodeURIComponent(timeMax)}`;
      primaryUrl += maxParam;
      holidayUrl += maxParam;
    }

    const startTime = Date.now();
    console.log(`[Sync] Starting Google Calendar fetch for timeMin: ${timeMin}, timeMax: ${timeMax}`);

    const [primaryRes, holidayRes] = await Promise.all([
      fetch(primaryUrl, {
        headers: {
          // @ts-ignore
          Authorization: `Bearer ${session.accessToken}`,
        },
      }),
      fetch(holidayUrl, {
        headers: {
          // @ts-ignore
          Authorization: `Bearer ${session.accessToken}`,
        },
      })
    ]);

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`[Sync] Google API fetch completed in ${duration}ms. Primary: ${primaryRes.status}, Holiday: ${holidayRes.status}`);

    if (!primaryRes.ok) {
      const errorText = await primaryRes.text();
      console.error(`[Sync] Primary Google API Error: ${errorText}`);
      return NextResponse.json({ error: "Google API error", details: errorText }, { status: primaryRes.status });
    }

    try {
      const primaryData = await primaryRes.json();
      let holidayData = { items: [] };
      
      if (holidayRes.ok) {
        holidayData = await holidayRes.json();
      } else {
        console.warn(`[Sync] Failed to fetch holidays: ${await holidayRes.text()}`);
      }

      const holidayItems = (holidayData.items || []).map((item: any) => ({
        ...item,
        isHoliday: true
      }));

      const combinedItems = [...(primaryData.items || []), ...holidayItems];

      console.log(`[Sync] Successfully parsed JSON. Found ${primaryData.items?.length || 0} primary events and ${holidayItems.length} holiday events.`);
      return NextResponse.json({ ...primaryData, items: combinedItems });
    } catch (parseError) {
      console.error(`[Sync] Failed to parse JSON from Google API: ${parseError}`);
      return NextResponse.json({ error: "Failed to parse JSON" }, { status: 500 });
    }
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

    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
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
