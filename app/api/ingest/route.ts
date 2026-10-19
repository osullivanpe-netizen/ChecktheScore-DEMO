import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { parseScorelines, matchesFixture } from "@/lib/parse-score";

// POST { handle: "GAA_handle", fixture_id: "..." }
//
// Pulls that handle's recent tweets from the X API, looks for a scoreline that matches
// the given fixture's two clubs, and if found, stores the raw tweet (source_tweets) and
// sets the fixture's score to match — proving the real pipeline end to end: X API ->
// parser -> Supabase write -> live scoreboard update (via the realtime subscription on
// the /scores page).
//
// Requires X_BEARER_TOKEN in the environment (an X/Twitter API v2 bearer token).
export async function POST(req: NextRequest) {
  const bearerToken = process.env.X_BEARER_TOKEN;
  if (!bearerToken) {
    return NextResponse.json(
      { error: "X_BEARER_TOKEN is not set in the environment" },
      { status: 500 }
    );
  }

  const { handle, fixture_id } = await req.json();
  if (!handle || !fixture_id) {
    return NextResponse.json({ error: "handle and fixture_id are required" }, { status: 400 });
  }

  const { data: fixture, error: fixtureError } = await supabase
    .from("fixtures")
    .select("*")
    .eq("id", fixture_id)
    .single();

  if (fixtureError || !fixture) {
    return NextResponse.json({ error: fixtureError?.message ?? "fixture not found" }, { status: 404 });
  }

  // 1. Resolve handle -> user id.
  const userRes = await fetch(`https://api.twitter.com/2/users/by/username/${handle}`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });
  if (!userRes.ok) {
    return NextResponse.json(
      { error: `X API user lookup failed: ${userRes.status} ${await userRes.text()}` },
      { status: 502 }
    );
  }
  const userJson = await userRes.json();
  const userId = userJson?.data?.id;
  if (!userId) {
    return NextResponse.json({ error: `handle @${handle} not found` }, { status: 404 });
  }

  // 2. Fetch that user's recent tweets.
  const tweetsRes = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?max_results=20&tweet.fields=created_at`,
    { headers: { Authorization: `Bearer ${bearerToken}` } }
  );
  if (!tweetsRes.ok) {
    return NextResponse.json(
      { error: `X API tweets fetch failed: ${tweetsRes.status} ${await tweetsRes.text()}` },
      { status: 502 }
    );
  }
  const tweetsJson = await tweetsRes.json();
  const tweets: { id: string; text: string }[] = tweetsJson?.data ?? [];

  // 3. Look for a tweet whose scoreline matches this fixture's two clubs.
  for (const tweet of tweets) {
    const scorelines = parseScorelines(tweet.text);
    if (scorelines.length < 2) continue;

    const { home, away } = matchesFixture(scorelines, fixture.home_club, fixture.away_club);
    if (!home || !away) continue;

    // Found a match — store the raw tweet and set the fixture's score to it.
    const { data: storedTweet, error: tweetInsertError } = await supabase
      .from("source_tweets")
      .insert({
        tweet_id: tweet.id,
        author_handle: handle,
        text: tweet.text,
        fixture_id: fixture.id,
        auto_applied: true,
      })
      .select()
      .single();

    if (tweetInsertError) {
      // Already stored (unique tweet_id) — not an error, just skip.
      continue;
    }

    const { data: updatedFixture, error: updateError } = await supabase
      .from("fixtures")
      .update({
        home_score_goals: home.goals,
        home_score_points: home.points,
        away_score_goals: away.goals,
        away_score_points: away.points,
      })
      .eq("id", fixture.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      matched: true,
      tweet: storedTweet,
      fixture: updatedFixture,
    });
  }

  return NextResponse.json({ matched: false, checked: tweets.length });
}
