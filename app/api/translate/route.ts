import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Invalid text" }, { status: 400 });
    }

    const translateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(text)}`;
    const translateResponse = await fetch(translateUrl, { cache: "no-store" });
    
    if (!translateResponse.ok) {
      throw new Error("Translation API failed");
    }

    const translateData = await translateResponse.json();
    let koreanTranslation = "번역을 불러오지 못했습니다.";
    
    if (translateData && translateData[0] && Array.isArray(translateData[0])) {
      koreanTranslation = translateData[0].map((segment: any) => segment[0]).join("");
    }

    return NextResponse.json({ ko: koreanTranslation });
    
  } catch (error: any) {
    console.error("Translate API Error:", error);
    return NextResponse.json({ error: error.message, ko: "번역 오류" }, { status: 500 });
  }
}
