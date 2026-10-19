import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST: insert a new message (the "type Hello World, store it" proof).
export async function POST(req: NextRequest) {
  const body = await req.json();
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("test_messages")
    .insert({ message })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

// GET: read back everything stored so far (the "prove it's really there" step).
export async function GET() {
  const { data, error } = await supabase
    .from("test_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
