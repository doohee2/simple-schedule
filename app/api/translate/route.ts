import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function fallbackTranslation(text: string): Promise<string> {
  const translateUrl = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=ko&q=${encodeURIComponent(text)}`;
  const translateResponse = await fetch(translateUrl, { 
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });

  if (!translateResponse.ok) {
    throw new Error("Fallback Translation API failed");
  }

  const translateData = await translateResponse.json();
  if (Array.isArray(translateData) && translateData.length > 0) {
    return translateData[0];
  }

  return "번역을 불러오지 못했습니다.";
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Invalid text" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    let koreanTranslation = "";

    if (apiKey) {
      try {
        // Use Gemini for translation
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

        const prompt = `Translate the following English philosophical quote into Korean. 
Make it sound like a profound quote or proverb.
Use a concise, plain tone (해라체/한다체) such as "~하라", "~이다", "~한다", instead of polite forms like "~하세요" or "~입니다".
Do NOT include any explanations, extra text, quotes, or markdown formatting. Just output the pure translated text.

Quote to translate:
"${text}"`;

        const result = await model.generateContent(prompt);
        koreanTranslation = result.response.text().trim().replace(/^["']|["']$/g, '');
      } catch (geminiError) {
        console.warn("Gemini API translation failed, falling back to free translation:", geminiError);
        koreanTranslation = await fallbackTranslation(text);
      }
    } else {
      // No API key, use fallback
      koreanTranslation = await fallbackTranslation(text);
    }

    return NextResponse.json({ ko: koreanTranslation });

  } catch (error: any) {
    console.error("Translate API Error:", error);
    return NextResponse.json({ error: error.message, ko: "번역 오류" }, { status: 500 });
  }
}
