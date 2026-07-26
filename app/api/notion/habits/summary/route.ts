import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const NOTION_API_VERSION = "2022-06-28";

const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
  }

  return createClient(supabaseUrl, supabaseKey);
};

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

interface NotionPropertySchema {
  type: string;
  id?: string;
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

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json({ error: "Start and end dates are required" }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { data: dbData, error: dbError } = await supabase
      .from("user_notion_tokens")
      .select("access_token, database_id")
      .eq("user_email", session.user.email)
      .single();

    if (dbError || !dbData || !dbData.access_token || !dbData.database_id) {
      return NextResponse.json({ summary: {}, configured: false });
    }

    const token = (dbData.access_token || "").trim();
    const databaseId = cleanDatabaseId(dbData.database_id);
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Notion-Version": NOTION_API_VERSION,
      "Content-Type": "application/json",
    };

    // 1. Fetch DB schema to determine primary date property
    const dbRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: "GET",
      headers,
    });

    if (!dbRes.ok) {
      return NextResponse.json({ summary: {}, error: "Failed to access database" });
    }

    const dbJson = await dbRes.json();
    const schemaProps: Record<string, NotionPropertySchema> = dbJson.properties || {};

    let datePropName: string | null = null;
    if (schemaProps["날짜"] && schemaProps["날짜"].type === "date") {
      datePropName = "날짜";
    } else {
      for (const [key, val] of Object.entries(schemaProps)) {
        if (val.type === "date") {
          datePropName = key;
          break;
        }
      }
    }

    if (!datePropName) {
      return NextResponse.json({ summary: {} });
    }

    // 2. Query Database in batch for the 2-month range
    const queryRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        page_size: 100,
        filter: {
          and: [
            {
              property: datePropName,
              date: { on_or_after: start },
            },
            {
              property: datePropName,
              date: { on_or_before: end },
            },
          ],
        },
      }),
    });

    if (!queryRes.ok) {
      console.error("[Notion Summary Query] Error:", await queryRes.text());
      return NextResponse.json({ summary: {} });
    }

    const queryJson = await queryRes.json();
    const pages: NotionPage[] = queryJson.results || [];

    const summary: Record<string, unknown> = {};

    for (const page of pages) {
      const dateProp = page.properties[datePropName];
      const dateStr = dateProp?.date?.start?.substring(0, 10);
      if (!dateStr) continue;

      let total = 0;
      let checked = 0;
      const parsedProperties: Array<{
        id?: string;
        name: string;
        type: string;
        value: unknown;
        options?: { id: string; name: string; color?: string }[];
      }> = [];

      for (const [name, prop] of Object.entries(page.properties)) {
        if (name === datePropName || name === "날짜" || name === "제목" || prop.type === "date" || prop.type === "title") {
          continue;
        }

        const schema = schemaProps[name] || {};

        if (prop.type === "checkbox") {
          total += 1;
          if (prop.checkbox === true) {
            checked += 1;
          }
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

      parsedProperties.sort((a, b) => {
        const isStatusA = a.type === "status" || a.name === "상태";
        const isStatusB = b.type === "status" || b.name === "상태";
        if (isStatusA && !isStatusB) return -1;
        if (!isStatusA && isStatusB) return 1;
        return a.name.localeCompare(b.name, "ko");
      });

      summary[dateStr] = {
        total,
        checked,
        completed: total > 0 && checked === total,
        data: {
          found: true,
          configured: true,
          pageId: page.id,
          url: page.url || null,
          properties: parsedProperties,
        },
      };
    }

    return NextResponse.json({ summary, configured: true });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("[Notion Summary GET] Server Error:", err.message);
    return NextResponse.json({ error: err.message, summary: {} }, { status: 500 });
  }
}
