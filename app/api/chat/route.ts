import { NextRequest } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin, type ChatMessageRow } from "@/lib/supabaseAdmin";
import { SYSTEM_PROMPT } from "@/prompts/system";
import {
  CTA_MESSAGE,
  CTA_TRIGGER_USER_MESSAGE_COUNT,
} from "@/prompts/cta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const MAX_HISTORY = 30;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type ChatRequest = {
  anonUserId: string;
  sessionId?: string | null;
  message: string;
};

export async function POST(req: NextRequest) {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const anonUserId = body.anonUserId?.trim();
  const userMessage = body.message?.trim();
  if (!anonUserId || !userMessage) {
    return new Response("anonUserId and message are required", { status: 400 });
  }

  let sessionId = body.sessionId ?? null;
  if (!sessionId) {
    const { data, error } = await supabaseAdmin
      .from("chat_sessions")
      .insert({
        anon_user_id: anonUserId,
        title: userMessage.slice(0, 60),
      })
      .select("id")
      .single();
    if (error || !data) {
      console.error("create session failed", error);
      return new Response("failed to create session", { status: 500 });
    }
    sessionId = data.id;
  } else {
    const { data: existing } = await supabaseAdmin
      .from("chat_sessions")
      .select("id, anon_user_id")
      .eq("id", sessionId)
      .maybeSingle();
    if (!existing || existing.anon_user_id !== anonUserId) {
      return new Response("session not found", { status: 404 });
    }
  }

  const { error: insertUserErr } = await supabaseAdmin
    .from("chat_messages")
    .insert({ session_id: sessionId, role: "user", content: userMessage });
  if (insertUserErr) {
    console.error("insert user msg failed", insertUserErr);
    return new Response("failed to save message", { status: 500 });
  }

  const shouldFireCta = await evaluateCtaTrigger(anonUserId);

  const { data: history } = await supabaseAdmin
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(MAX_HISTORY);

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...((history ?? []) as Pick<ChatMessageRow, "role" | "content">[]).map(
      (m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      }),
    ),
  ];

  const encoder = new TextEncoder();
  const capturedSessionId = sessionId;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(obj)}\n\n`),
        );
      };

      send({ type: "session", sessionId: capturedSessionId });

      let full = "";
      try {
        const completion = await openai.chat.completions.create({
          model: MODEL,
          stream: true,
          temperature: 0.6,
          messages,
        });

        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) {
            full += delta;
            send({ type: "delta", delta });
          }
        }
      } catch (err) {
        console.error("openai stream failed", err);
        send({ type: "error", message: "AI応答の取得に失敗しました" });
        controller.close();
        return;
      }

      if (full) {
        const { error } = await supabaseAdmin
          .from("chat_messages")
          .insert({
            session_id: capturedSessionId,
            role: "assistant",
            content: full,
          });
        if (error) console.error("insert assistant msg failed", error);
      }

      if (shouldFireCta) {
        const { error } = await supabaseAdmin
          .from("chat_messages")
          .insert({
            session_id: capturedSessionId,
            role: "assistant",
            content: CTA_MESSAGE,
          });
        if (error) {
          console.error("insert cta msg failed", error);
        } else {
          send({ type: "cta", content: CTA_MESSAGE });
          const { error: flagErr } = await supabaseAdmin
            .from("anon_user_flags")
            .upsert(
              { anon_user_id: anonUserId, cta_shown_at: new Date().toISOString() },
              { onConflict: "anon_user_id" },
            );
          if (flagErr) console.error("upsert cta flag failed", flagErr);
        }
      }

      send({ type: "done" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

async function evaluateCtaTrigger(anonUserId: string): Promise<boolean> {
  const { data: flag } = await supabaseAdmin
    .from("anon_user_flags")
    .select("cta_shown_at")
    .eq("anon_user_id", anonUserId)
    .maybeSingle();
  if (flag?.cta_shown_at) return false;

  const { data: sessions } = await supabaseAdmin
    .from("chat_sessions")
    .select("id")
    .eq("anon_user_id", anonUserId);
  const sessionIds = (sessions ?? []).map((s) => s.id);
  if (sessionIds.length === 0) return false;

  const { count, error } = await supabaseAdmin
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .in("session_id", sessionIds)
    .eq("role", "user");
  if (error) {
    console.error("count user msgs failed", error);
    return false;
  }
  return (count ?? 0) === CTA_TRIGGER_USER_MESSAGE_COUNT;
}
