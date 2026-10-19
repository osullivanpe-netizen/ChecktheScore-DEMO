import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET: list fixtures with their current score, most recent first.
export async function GET() {
  const { data, error } = await supabase
    .from("fixtures")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

// POST: create a fixture — used both for manually entering a real weekend result
// and as the target a Twitter-ingested score gets matched against.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { home_club, away_club, competition, venue, scheduled_time } = body ?? {};

  if (!home_club || !away_club) {
    return NextResponse.json({ error: "home_club and away_club are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("fixtures")
    .insert({ home_club, away_club, competition, venue, scheduled_time, status: "live" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201 });
}
