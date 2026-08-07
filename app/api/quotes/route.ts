import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch random quote from ZenQuotes
    const zenResponse = await fetch("https://zenquotes.io/api/random", {
      // Prevent caching at Next.js level so we get a random quote every time
      cache: "no-store", 
    });
    
    if (!zenResponse.ok) {
      throw new Error(`ZenQuotes API error: ${zenResponse.status}`);
    }
    
    const zenData = await zenResponse.json();
    if (!zenData || !zenData[0] || !zenData[0].q) {
      throw new Error("Invalid response from ZenQuotes");
    }

    return NextResponse.json({
      en: zenData[0].q,
      author: zenData[0].a || "Unknown"
    });
    
  } catch (error: any) {
    console.error("Quotes API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
