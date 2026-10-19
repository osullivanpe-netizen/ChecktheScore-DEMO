"use client";

import { useEffect, useState } from "react";

type TestMessage = {
  id: string;
  message: string;
  created_at: string;
};

export default function HelloWorldPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorText, setErrorText] = useState("");

  async function loadMessages() {
    const res = await fetch("/api/hello-world");
    const json = await res.json();
    if (res.ok) setMessages(json.data ?? []);
  }

  useEffect(() => {
    loadMessages();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setStatus("saving");
    setErrorText("");

    const res = await fetch("/api/hello-world", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input }),
    });
    const json = await res.json();

    if (!res.ok) {
      setStatus("error");
      setErrorText(json.error ?? "Something went wrong");
      return;
    }

    setInput("");
    setStatus("idle");
    await loadMessages();
  }

  return (
    <main style={{ maxWidth: 560, margin: "48px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Environment connectivity test</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>
        Type a message below. On submit, this calls a Next.js API route, which writes a row
        into the <code>test_messages</code> table in Supabase (Postgres), then reads it straight
        back and lists it here — proving the app and the database can talk to each other.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Hello World"
          style={{ flex: 1, padding: "10px 12px", border: "1px solid #ccc", borderRadius: 6, fontSize: 16 }}
        />
        <button
          type="submit"
          disabled={status === "saving"}
          style={{
            padding: "10px 18px",
            borderRadius: 6,
            border: "none",
            background: "#1a7f37",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {status === "saving" ? "Saving…" : "Store in database"}
        </button>
      </form>

      {status === "error" && (
        <p style={{ color: "#b00020", marginBottom: 16 }}>Error: {errorText}</p>
      )}

      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
        Stored in Supabase ({messages.length})
      </h2>
      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.map((m) => (
          <li
            key={m.id}
            style={{
              border: "1px solid #e0e0e0",
              borderRadius: 6,
              padding: "10px 14px",
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <span>{m.message}</span>
            <span style={{ color: "#888", fontSize: 13 }}>
              {new Date(m.created_at).toLocaleString()}
            </span>
          </li>
        ))}
        {messages.length === 0 && <li style={{ color: "#888" }}>Nothing stored yet.</li>}
      </ul>
    </main>
  );
}
