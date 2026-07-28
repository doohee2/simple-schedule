import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const NOTION_API_VERSION = "2022-06-28";

const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase 서버 전용 환경 변수(SUPABASE_URL, SUPABASE_ANON_KEY 등)가 설정되지 않았습니다.");
  }

  return createClient(supabaseUrl, supabaseKey);
};

const dateSchema = z.string().min(1, "날짜 형식은 필수입니다.");

const updateItemSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  value: z.any().optional(),
});

const postHabitsSchema = z.object({
  pageId: z.string().min(1, "유효한 페이지 ID가 필요합니다."),
  updates: z.array(updateItemSchema),
});

const cleanDatabaseId = (id?: string) => {
  if (!id) return "";
  let clean = id.trim();
  if (clean.includes("?")) {
    clean = clean.split("?")[0];
  }
  if (clean.includes("/")) {
    const parts = clean.split("/");
    clean = parts[parts.length - 1];
  }
  return clean.replace(/[^a-zA-Z0-9-]/g, "");
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
    const dateParam = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const parseResult = dateSchema.safeParse(dateParam);
    if (!parseResult.success) {
      return NextResponse.json({ error: "잘못된 날짜 파라미터입니다." }, { status: 400 });
    }
    const date = parseResult.data;

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

    const token = (dbData.access_token || "").trim();
    const databaseId = cleanDatabaseId(dbData.database_id);
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

      let reasonMsg = `노션 데이터베이스 접근 실패 (상태: ${dbRes.status}). 토큰 및 데이터베이스 ID를 확인해 주세요.`;
      if (dbRes.status === 404) {
        reasonMsg = `[상태: 404 Not Found] 노션 API가 해당 데이터베이스에 접근할 수 없습니다. \n👉 해결 방법: 1) 노션의 대상 데이터베이스 페이지 열기 → 우측 상단 '•••' (더보기) 메뉴 → '연결(Add connections)'에서 발급받으신 '노션 통합(Bot)'을 검색해 추가(권한 공유)해 주세요. \n2) 입력하신 데이터베이스 ID(${databaseId})가 올바른지 확인해 주세요.`;
      } else if (dbRes.status === 401) {
        reasonMsg = `[상태: 401 Unauthorized] 노션 액세스 토큰 인증에 실패했습니다. 상단 헤더의 노션 설정에서 시크릿 토큰(secret_... 또는 ntn_...)을 다시 확인해 주세요.`;
      }

      return NextResponse.json({
        found: false,
        configured: true,
        message: reasonMsg,
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
      if (name === datePropName || name === "날짜" || name === "제목" || prop.type === "date" || prop.type === "title") {
        continue;
      }

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
      }
    }

    // Sort: "상태" (status type or named "상태") first, then alphabetical (가나다) order
    parsedProperties.sort((a, b) => {
      const isStatusA = a.type === "status" || a.name === "상태";
      const isStatusB = b.type === "status" || b.name === "상태";
      
      if (isStatusA && !isStatusB) return -1;
      if (!isStatusA && isStatusB) return 1;
      
      return a.name.localeCompare(b.name, "ko");
    });

    return NextResponse.json({
      found: true,
      configured: true,
      pageId,
      url: page.url,
      properties: parsedProperties,
    });
  } catch (error: unknown) {
    console.error("[Notion Habits GET] Server Error:", error);
    return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bodyRaw = await req.json().catch(() => ({}));
    const parseResult = postHabitsSchema.safeParse(bodyRaw);
    if (!parseResult.success) {
      return NextResponse.json({ error: "입력 데이터 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const { pageId, updates } = parseResult.data;

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
      return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: updateRes.status });
    }

    const updateJson = await updateRes.json();
    return NextResponse.json({ success: true, data: updateJson });
  } catch (error: unknown) {
    console.error("[Notion Habits POST] Server Error:", error);
    return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
  }
}
