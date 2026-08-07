import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 1. Fetch random quote from ZenQuotes
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

    const englishQuote = zenData[0].q;
    const author = zenData[0].a || "Unknown";

    // 2. Translate to Korean using Google Translate free endpoint
    const translateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(englishQuote)}`;
    
    const translateResponse = await fetch(translateUrl, { cache: "no-store" });
    let koreanTranslation = "";
    
    if (translateResponse.ok) {
      const translateData = await translateResponse.json();
      // Google translate returns an array where [0] contains an array of translated segments
      if (translateData && translateData[0] && Array.isArray(translateData[0])) {
        koreanTranslation = translateData[0].map((segment: any) => segment[0]).join("");
      }
    } else {
      koreanTranslation = "번역을 불러오지 못했습니다.";
    }

    // 3. Return combined response
    return NextResponse.json({
      en: englishQuote,
      ko: koreanTranslation,
      author: author
    });
    
  } catch (error: any) {
    console.error("Quotes API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
