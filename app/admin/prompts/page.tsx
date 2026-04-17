import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthed, isAdminConfigured } from "@/lib/adminAuth";
import { getPrompt, getPromptDefault } from "@/lib/promptStore";
import LogoutButton from "../LogoutButton";
import PromptEditor from "./PromptEditor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PromptsPage() {
  if (!isAdminConfigured()) redirect("/admin");
  const authed = await isAdminAuthed();
  if (!authed) redirect("/admin");

  const current = await getPrompt("system");
  const fallback = getPromptDefault("system");

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-xs text-sky-600 hover:underline">
            ← back to dashboard
          </Link>
          <h1 className="text-lg font-semibold mt-1">Prompt settings</h1>
          <p className="text-xs text-slate-500">
            Edits apply immediately — the next chat request reads from this value.
          </p>
        </div>
        <LogoutButton />
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <PromptEditor initial={current} fallback={fallback} />

        <section className="bg-white rounded-2xl border border-slate-200 p-5 text-sm text-slate-600 leading-relaxed space-y-2">
          <p className="font-semibold text-slate-700">Tips</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Changes hit the next chat request (no cache).</li>
            <li>
              The built-in default is the code-committed prompt in{" "}
              <code className="bg-slate-100 px-1 rounded">prompts/system.ts</code>.
              &quot;Reset to default&quot; only updates the textarea — click Save to persist.
            </li>
            <li>
              The CTA message (4th-turn booking pitch) is not editable here — it lives in{" "}
              <code className="bg-slate-100 px-1 rounded">prompts/cta.ts</code> and ships with the
              build.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
