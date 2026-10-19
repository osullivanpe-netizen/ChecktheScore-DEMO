import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST: log one score event (a goal or a point for one side) against a fixture,
// then bump that fixture's running goals-points total and return it.
// source distinguishes a manually-entered event from one a tweet produced.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { fixture_id, team, type, minute, source } = body ?? {};

  if (!fixture_id || !["home", "away"].includes(team) || !["goal", "point"].includes(type)) {
    return NextResponse.json(
      { error: "fixture_id, team (home/away) and type (goal/point) are required" },
      { status: 400 }
    );
  }

  const { data: fixture, error: fetchError } = await supabase
    .from("fixtures")
    .select("*")
    .eq("id", fixture_id)
    .single();

  if (fetchError || !fixture) {
    return NextResponse.json({ error: fetchError?.message ?? "fixture not found" }, { status: 404 });
  }

  const column =
    team === "home"
      ? type === "goal"
        ? "home_score_goals"
        : "home_score_points"
      : type === "goal"
      ? "away_score_goals"
      : "away_score_points";

  const { error: eventError } = await supabase.from("score_events").insert({
    fixture_id,
    team,
    type,
    minute: minute ?? null,
    source: source === "twitter" ? "twitter" : "manual",
  });

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("fixtures")
    .update({ [column]: fixture[column] + 1 })
    .eq("id", fixture_id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ data: updated }, { status: 201 });
}
