import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const NOTION_API_VERSION = "2022-06-28";

const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase 환경 변수(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)가 설정되지 않았습니다.");
  }

  return createClient(supabaseUrl, supabaseKey);
};

export type HabitPropertyValue = boolean | string | number | null | undefined;

export interface HabitProperty {
  id: string;
  name: string;
  type: 'checkbox' | 'status' | 'select' | 'rich_text' | 'number' | 'title' | 'other';
  value: HabitPropertyValue;
  options?: { id: string; name: string; color?: string }[];
}

interface NotionPropertySchema {
  type: string;
  id: string;
  status?: { options?: { id: string; name: string; color?: string }[] };
  select?: { options?: { id: string; name: string; color?: string }[] };
  checkbox?: boolean;
  number?: number | null;
  rich_text?: { plain_text: string }[];
  title?: { plain_text: string }[];
  date?: { start?: string };
}

interface NotionPage {
  id: string;
  url?: string;
  properties: Record<string, NotionPropertySchema>;
}

interface QueryBody {
  page_size: number;
  filter?: {
    property: string;
    date: {
      equals: string;
    };
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    const supabase = getSupabaseClient();
    const { data: dbData, error: dbError } = await supabase
      .from("user_notion_tokens")
      .select("access_token, database_id")
      .eq("user_email", session.user.email)
      .single();

    if (dbError || !dbData || !dbData.access_token || !dbData.database_id) {
      return NextResponse.json({
        found: false,
        configured: false,
        message: "노션 액세스 토큰 또는 데이터베이스 ID가 설정되지 않았습니다. 상단 헤더의 노션 아이콘을 눌러 설정을 진행해 주세요.",
      });
    }

    const { access_token: token, database_id: databaseId } = dbData;
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Notion-Version": NOTION_API_VERSION,
      "Content-Type": "application/json",
    };

    // 1. Fetch Database schema to inspect properties and select/status options
    const dbRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: "GET",
      headers,
    });

    if (!dbRes.ok) {
      const errText = await dbRes.text();
      console.error("[Notion DB Schema] Error:", errText);
      return NextResponse.json({
        found: false,
        configured: true,
        message: `노션 데이터베이스 접근 실패 (상태: ${dbRes.status}). 토큰 권한 및 데이터베이스 ID를 확인해 주세요.`,
        errorDetails: errText,
      });
    }

    const dbJson = await dbRes.json();
    const schemaProps: Record<string, NotionPropertySchema> = dbJson.properties || {};

    // Determine target date property name ("날짜" primary default)
    let datePropName: string | null = null;
    if (schemaProps["날짜"] && schemaProps["날짜"].type === "date") {
      datePropName = "날짜";
    } else {
      // Find any property of type date if "날짜" does not exist
      for (const [key, val] of Object.entries(schemaProps)) {
        if (val.type === "date") {
          datePropName = key;
          break;
        }
      }
    }

    // 2. Query Database for today's record
    const queryBody: QueryBody = {
      page_size: 20,
    };

    if (datePropName) {
      queryBody.filter = {
        property: datePropName,
        date: {
          equals: date,
        },
      };
    }

    const queryRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers,
      body: JSON.stringify(queryBody),
    });

    if (!queryRes.ok) {
      const errText = await queryRes.text();
      console.error("[Notion DB Query] Error:", errText);
      return NextResponse.json({
        found: false,
        configured: true,
        message: "노션 데이터베이스 레코드 조회 중 오류가 발생했습니다.",
        errorDetails: errText,
      });
    }

    const queryJson = await queryRes.json();
    let matchingPages: NotionPage[] = queryJson.results || [];

    // If no date column filter applied, try matching date string in title or any date property in fetched rows
    if (!datePropName && matchingPages.length > 0) {
      matchingPages = matchingPages.filter((page) => {
        for (const prop of Object.values(page.properties || {})) {
          if (prop.type === "date" && prop.date?.start && prop.date.start.startsWith(date)) {
            return true;
          }
          if (prop.type === "title") {
            const text = prop.title?.map((t) => t.plain_text).join("") || "";
            if (text.includes(date)) return true;
          }
        }
        return false;
      });
    }

    if (matchingPages.length === 0) {
      return NextResponse.json({
        found: false,
        configured: true,
        message: `해당 날짜(${date})의 노션 습관 체크리스트 레코드가 없습니다. 노션 데이터베이스에 '${date}' 날짜 레코드를 생성해 주세요.`,
      });
    }

    const page = matchingPages[0];
    const pageId = page.id;

    // 3. Parse properties into clean items
    const parsedProperties: HabitProperty[] = [];
    
    for (const [name, prop] of Object.entries(page.properties)) {
      if (name === datePropName) continue;

      const schema = schemaProps[name] || {};

      if (prop.type === "checkbox") {
        parsedProperties.push({
          id: prop.id,
          name,
          type: "checkbox",
          value: prop.checkbox,
        });
      } else if (prop.type === "status") {
        parsedProperties.push({
          id: prop.id,
          name,
          type: "status",
          value: (prop as unknown as { status?: { name?: string } }).status?.name || "",
          options: schema.status?.options || [],
        });
      } else if (prop.type === "select") {
        parsedProperties.push({
          id: prop.id,
          name,
          type: "select",
          value: (prop as unknown as { select?: { name?: string } }).select?.name || "",
          options: schema.select?.options || [],
        });
      } else if (prop.type === "rich_text") {
        parsedProperties.push({
          id: prop.id,
          name,
          type: "rich_text",
          value: prop.rich_text?.map((t) => t.plain_text).join("") || "",
        });
      } else if (prop.type === "number") {
        parsedProperties.push({
          id: prop.id,
          name,
          type: "number",
          value: prop.number !== null && prop.number !== undefined ? String(prop.number) : "",
        });
      } else if (prop.type === "title") {
        parsedProperties.push({
          id: prop.id,
          name,
          type: "title",
          value: prop.title?.map((t) => t.plain_text).join("") || "",
        });
      }
    }

    // Sort: checkboxes first, then status/select, then title/text/number
    parsedProperties.sort((a, b) => {
      const typeWeight = (t: string) => {
        if (t === 'checkbox') return 1;
        if (t === 'status' || t === 'select') return 2;
        return 3;
      };
      const wA = typeWeight(a.type);
      const wB = typeWeight(b.type);
      if (wA !== wB) return wA - wB;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      found: true,
      configured: true,
      pageId,
      url: page.url,
      properties: parsedProperties,
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("[Notion Habits GET] Server Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { pageId, updates } = body;

    if (!pageId || !Array.isArray(updates)) {
      return NextResponse.json({ error: "Invalid updates format" }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { data: dbData, error: dbError } = await supabase
      .from("user_notion_tokens")
      .select("access_token")
      .eq("user_email", session.user.email)
      .single();

    if (dbError || !dbData || !dbData.access_token) {
      return NextResponse.json({ error: "No access token found" }, { status: 403 });
    }

    const properties: Record<string, unknown> = {};

    for (const item of (updates as { name?: string; type?: string; value?: HabitPropertyValue }[])) {
      if (!item.name || !item.type) continue;
      
      if (item.type === "checkbox") {
        properties[item.name] = { checkbox: Boolean(item.value) };
      } else if (item.type === "status") {
        properties[item.name] = { status: item.value ? { name: String(item.value) } : null };
      } else if (item.type === "select") {
        properties[item.name] = { select: item.value ? { name: String(item.value) } : null };
      } else if (item.type === "rich_text") {
        properties[item.name] = {
          rich_text: item.value ? [{ text: { content: String(item.value) } }] : [],
        };
      } else if (item.type === "title") {
        properties[item.name] = {
          title: item.value ? [{ text: { content: String(item.value) } }] : [],
        };
      } else if (item.type === "number") {
        const num = parseFloat(String(item.value));
        properties[item.name] = { number: isNaN(num) ? null : num };
      }
    }

    const updateRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${dbData.access_token}`,
        "Notion-Version": NOTION_API_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties }),
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error("[Notion Page Update] Error:", errText);
      return NextResponse.json({ error: "Failed to update Notion page", details: errText }, { status: updateRes.status });
    }

    const updateJson = await updateRes.json();
    return NextResponse.json({ success: true, data: updateJson });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("[Notion Habits POST] Server Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
