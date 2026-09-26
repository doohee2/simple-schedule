import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "four_character_Chinese_idiom.csv");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    
    // Parse CSV safely handling quotes
    const lines = fileContent.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("No idioms found in CSV");
    }
    
    // Choose a random line (excluding header)
    const randomIndex = Math.floor(Math.random() * (lines.length - 1)) + 1;
    const randomLine = lines[randomIndex];
    
    // Parse CSV line properly handling quoted fields with commas
    const parseCSVLine = (text: string) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };
    
    const parsed = parseCSVLine(randomLine);
    
    if (parsed.length < 4) {
      throw new Error("Failed to parse idiom line");
    }
    
    return NextResponse.json({
      hanja: parsed[0],
      hangul: parsed[1],
      meaning: parsed[2],
      pronunciation: parsed[3],
    });
    
  } catch (error: any) {
    console.error("Idioms API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
