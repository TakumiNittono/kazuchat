import Link from "next/link";
import { isAdminAuthed, isAdminConfigured } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import LoginForm from "./LoginForm";
import LogoutButton from "./LogoutButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UserRow = {
  anon_user_id: string;
  sessions: number;
  user_messages: number;
  last_activity: string;
};

type SessionRow = {
  id: string;
  anon_user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
};

async function loadDashboard() {
  const [sessionsRes, messagesRes, pushRes] = await Promise.all([
    supabaseAdmin
      .from("chat_sessions")
      .select("id, anon_user_id, title, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(200),
    supabaseAdmin.from("chat_messages").select("session_id, role, created_at"),
    supabaseAdmin.from("push_subscriptions").select("endpoint", { count: "exact", head: true }),
  ]);

  const sessions = sessionsRes.data ?? [];
  const messages = messagesRes.data ?? [];

  const sessionIdToAnon = new Map<string, string>();
  for (const s of sessions) sessionIdToAnon.set(s.id, s.anon_user_id);

  const userMap = new Map<string, UserRow>();
  for (const s of sessions) {
    const row = userMap.get(s.anon_user_id) ?? {
      anon_user_id: s.anon_user_id,
      sessions: 0,
      user_messages: 0,
      last_activity: s.updated_at,
    };
    row.sessions += 1;
    if (s.updated_at > row.last_activity) row.last_activity = s.updated_at;
    userMap.set(s.anon_user_id, row);
  }

  const sessionMessageCount = new Map<string, number>();
  let totalUserMessages = 0;
  let totalAssistantMessages = 0;
  for (const m of messages) {
    sessionMessageCount.set(
      m.session_id,
      (sessionMessageCount.get(m.session_id) ?? 0) + 1,
    );
    const anon = sessionIdToAnon.get(m.session_id);
    if (m.role === "user") {
      totalUserMessages += 1;
      if (anon) {
        const row = userMap.get(anon);
        if (row) row.user_messages += 1;
      }
    } else if (m.role === "assistant") {
      totalAssistantMessages += 1;
    }
  }

  const sessionRows: SessionRow[] = sessions.slice(0, 50).map((s) => ({
    id: s.id,
    anon_user_id: s.anon_user_id,
    title: s.title,
    created_at: s.created_at,
    updated_at: s.updated_at,
    message_count: sessionMessageCount.get(s.id) ?? 0,
  }));

  const users = Array.from(userMap.values()).sort((a, b) =>
    a.last_activity < b.last_activity ? 1 : -1,
  );

  return {
    stats: {
      users: userMap.size,
      sessions: sessions.length,
      userMessages: totalUserMessages,
      assistantMessages: totalAssistantMessages,
      pushSubscribers: pushRes.count ?? 0,
    },
    users: users.slice(0, 50),
    recentSessions: sessionRows,
  };
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function shortId(id: string) {
  return id.slice(0, 8);
}

export default async function AdminPage() {
  if (!isAdminConfigured()) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-semibold">Admin disabled</h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            <code className="bg-slate-200 px-1 rounded">ADMIN_EMAIL</code> と{" "}
            <code className="bg-slate-200 px-1 rounded">ADMIN_PASSWORD</code>{" "}
            を <code>.env.local</code> に設定してください。
          </p>
        </div>
      </main>
    );
  }

  const authed = await isAdminAuthed();
  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <LoginForm />
      </main>
    );
  }

  const { stats, users, recentSessions } = await loadDashboard();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Chat with Marin &mdash; Admin</h1>
          <p className="text-xs text-slate-500">
            read-only dashboard &middot; {formatTime(new Date().toISOString())}
          </p>
        </div>
        <LogoutButton />
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Anon users" value={stats.users} />
          <StatCard label="Sessions" value={stats.sessions} />
          <StatCard label="User msgs" value={stats.userMessages} />
          <StatCard label="Bot msgs" value={stats.assistantMessages} />
          <StatCard label="Push subs" value={stats.pushSubscribers} />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-2">
            Top users by activity
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2">anon_user_id</th>
                  <th className="text-right px-4 py-2">sessions</th>
                  <th className="text-right px-4 py-2">user msgs</th>
                  <th className="text-left px-4 py-2">last activity</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                      no users yet
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u.anon_user_id}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-2 font-mono text-xs">
                        {u.anon_user_id}
                      </td>
                      <td className="px-4 py-2 text-right">{u.sessions}</td>
                      <td className="px-4 py-2 text-right">{u.user_messages}</td>
                      <td className="px-4 py-2 text-slate-500">
                        {formatTime(u.last_activity)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-2">
            Recent sessions
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2">session</th>
                  <th className="text-left px-4 py-2">anon_user_id</th>
                  <th className="text-left px-4 py-2">title</th>
                  <th className="text-right px-4 py-2">msgs</th>
                  <th className="text-left px-4 py-2">updated</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      no sessions yet
                    </td>
                  </tr>
                ) : (
                  recentSessions.map((s) => (
                    <tr
                      key={s.id}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-2 font-mono text-xs">
                        <Link
                          href={`/admin/sessions/${s.id}`}
                          className="text-sky-600 hover:underline"
                        >
                          {shortId(s.id)}
                        </Link>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-slate-600">
                        {s.anon_user_id}
                      </td>
                      <td className="px-4 py-2 text-slate-700 max-w-xs truncate">
                        {s.title ?? <span className="text-slate-400">&mdash;</span>}
                      </td>
                      <td className="px-4 py-2 text-right">{s.message_count}</td>
                      <td className="px-4 py-2 text-slate-500">
                        {formatTime(s.updated_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-semibold tabular-nums mt-1">{value}</div>
    </div>
  );
}
