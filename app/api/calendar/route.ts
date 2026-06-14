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

    let url = "https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=250";
    if (timeMin) url += `&timeMin=${encodeURIComponent(timeMin)}`;
    if (timeMax) url += `&timeMax=${encodeURIComponent(timeMax)}`;

    const fs = require('fs');
    const logToFile = (msg: string) => {
      const timestamp = new Date().toISOString();
      fs.appendFileSync('sync_debug.log', `[${timestamp}] ${msg}\n`);
      console.log(msg);
    };

    const startTime = Date.now();
    logToFile(`[Sync] Starting Google Calendar fetch for timeMin: ${timeMin}, timeMax: ${timeMax}`);

    const res = await fetch(url, {
      headers: {
        // @ts-ignore
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    const endTime = Date.now();
    const duration = endTime - startTime;
    logToFile(`[Sync] Google API fetch completed in ${duration}ms with status ${res.status}`);

    if (!res.ok) {
      const errorText = await res.text();
      logToFile(`[Sync] Google API Error: ${errorText}`);
      return NextResponse.json({ error: "Google API error", details: errorText }, { status: res.status });
    }

    try {
      const data = await res.json();
      logToFile(`[Sync] Successfully parsed JSON. Found ${data.items?.length || 0} events.`);
      return NextResponse.json(data);
    } catch (parseError) {
      logToFile(`[Sync] Failed to parse JSON from Google API: ${parseError}`);
      return NextResponse.json({ error: "Failed to parse JSON" }, { status: 500 });
    }
  } catch (error: any) {
    const fs = require('fs');
    fs.appendFileSync('sync_debug.log', `[${new Date().toISOString()}] [Sync] Internal Server Error: ${error.message}\n`);
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
