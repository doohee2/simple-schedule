import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase 서버 전용 환경 변수(SUPABASE_URL, SUPABASE_ANON_KEY 등)가 설정되지 않았습니다.");
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

const tokenPostSchema = z.object({
  token: z.string().min(1, "토큰은 필수입니다."),
  databaseId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("user_notion_tokens")
      .select("access_token, database_id")
      .eq("user_email", session.user.email)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116: no rows found is expected when no token has been saved yet
      console.error("[Notion Token GET] Supabase Error:", error);
      return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
    }

    return NextResponse.json({ 
      token: data?.access_token || "",
      databaseId: data?.database_id || "" 
    });
  } catch (error: unknown) {
    console.error("[Notion Token GET] Server Error:", error);
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
    const parseResult = tokenPostSchema.safeParse(bodyRaw);
    if (!parseResult.success) {
      return NextResponse.json({ error: "입력 데이터 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const { token, databaseId } = parseResult.data;

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("user_notion_tokens")
      .upsert(
        {
          user_email: session.user.email,
          access_token: token.trim(),
          database_id: cleanDatabaseId(databaseId || ""),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_email" }
      )
      .select();

    if (error) {
      console.error("[Notion Token POST] Supabase Error:", error);
      return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error("[Notion Token POST] Server Error:", error);
    return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
  }
}
