"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Fixture = {
  id: string;
  home_club: string;
  away_club: string;
  competition: string | null;
  venue: string | null;
  status: string;
  home_score_goals: number;
  home_score_points: number;
  away_score_goals: number;
  away_score_points: number;
};

function gp(goals: number, points: number) {
  return `${goals}-${points.toString().padStart(2, "0")}`;
}

export default function ScoresPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [homeClub, setHomeClub] = useState("");
  const [awayClub, setAwayClub] = useState("");
  const [competition, setCompetition] = useState("");

  async function loadFixtures() {
    const res = await fetch("/api/fixtures");
    const json = await res.json();
    if (res.ok) setFixtures(json.data ?? []);
  }

  useEffect(() => {
    loadFixtures();

    // Supabase realtime subscription — the same mechanism the production app uses
    // so the scoreboard updates instantly without polling, including for rows
    // inserted by the Twitter ingestion route running server-side.
    const channel = supabase
      .channel("fixtures-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "fixtures" }, () => {
        loadFixtures();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function createFixture(e: React.FormEvent) {
    e.preventDefault();
    if (!homeClub.trim() || !awayClub.trim()) return;
    await fetch("/api/fixtures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ home_club: homeClub, away_club: awayClub, competition }),
    });
    setHomeClub("");
    setAwayClub("");
    setCompetition("");
    await loadFixtures();
  }

  async function logEvent(fixtureId: string, team: "home" | "away", type: "goal" | "point") {
    await fetch("/api/score-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fixture_id: fixtureId, team, type, source: "manual" }),
    });
    await loadFixtures();
  }

  return (
    <main style={{ maxWidth: 720, margin: "48px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Manual score entry</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>
        Add a real fixture from this weekend, tap goal/point as it happened, and watch the
        goals-points score update live below — the same manual-entry path the production app uses,
        proved fresh here against this environment&apos;s own database.
      </p>

      <form onSubmit={createFixture} style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
        <input
          value={homeClub}
          onChange={(e) => setHomeClub(e.target.value)}
          placeholder="Home club"
          style={{ flex: 1, minWidth: 140, padding: "8px 10px", border: "1px solid #ccc", borderRadius: 6 }}
        />
        <input
          value={awayClub}
          onChange={(e) => setAwayClub(e.target.value)}
          placeholder="Away club"
          style={{ flex: 1, minWidth: 140, padding: "8px 10px", border: "1px solid #ccc", borderRadius: 6 }}
        />
        <input
          value={competition}
          onChange={(e) => setCompetition(e.target.value)}
          placeholder="Competition (optional)"
          style={{ flex: 1, minWidth: 140, padding: "8px 10px", border: "1px solid #ccc", borderRadius: 6 }}
        />
        <button
          type="submit"
          style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#1a7f37", color: "white", fontWeight: 600 }}
        >
          Add fixture
        </button>
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {fixtures.map((f) => (
          <div key={f.id} style={{ border: "1px solid #e0e0e0", borderRadius: 8, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <strong>
                {f.home_club} v {f.away_club}
              </strong>
              {f.competition && <span style={{ color: "#888", fontSize: 13 }}>{f.competition}</span>}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
              {gp(f.home_score_goals, f.home_score_points)} — {gp(f.away_score_goals, f.away_score_points)}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => logEvent(f.id, "home", "goal")} style={btnStyle}>
                {f.home_club} Goal
              </button>
              <button onClick={() => logEvent(f.id, "home", "point")} style={btnStyle}>
                {f.home_club} Point
              </button>
              <button onClick={() => logEvent(f.id, "away", "goal")} style={btnStyle}>
                {f.away_club} Goal
              </button>
              <button onClick={() => logEvent(f.id, "away", "point")} style={btnStyle}>
                {f.away_club} Point
              </button>
            </div>
          </div>
        ))}
        {fixtures.length === 0 && <p style={{ color: "#888" }}>No fixtures yet — add one above.</p>}
      </div>
    </main>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid #ccc",
  background: "white",
  cursor: "pointer",
  fontSize: 13,
};
