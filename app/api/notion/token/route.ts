import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase 환경 변수(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)가 설정되지 않았습니다.");
  }

  return createClient(supabaseUrl, supabaseKey);
};

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("user_notion_tokens")
      .select("access_token")
      .eq("user_email", session.user.email)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116: no rows found is expected when no token has been saved yet
      console.error("[Notion Token GET] Supabase Error:", error);
      return NextResponse.json({ error: "Failed to fetch token from DB", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ token: data?.access_token || "" });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[Notion Token GET] Server Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await req.json();
    if (typeof token !== "string") {
      return NextResponse.json({ error: "Invalid token format" }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("user_notion_tokens")
      .upsert(
        {
          user_email: session.user.email,
          access_token: token.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_email" }
      )
      .select();

    if (error) {
      console.error("[Notion Token POST] Supabase Error:", error);
      return NextResponse.json({ error: "Failed to save token to DB", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[Notion Token POST] Server Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
