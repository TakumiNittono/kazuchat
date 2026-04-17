import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SYSTEM_PROMPT as DEFAULT_SYSTEM_PROMPT } from "@/prompts/system";

export type PromptKey = "system";

const DEFAULTS: Record<PromptKey, string> = {
  system: DEFAULT_SYSTEM_PROMPT,
};

export async function getPrompt(key: PromptKey): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin
      .from("admin_config")
      .select("value")
      .eq("key", `prompt:${key}`)
      .maybeSingle();
    if (error) {
      console.error("getPrompt failed", error);
      return DEFAULTS[key];
    }
    return data?.value ?? DEFAULTS[key];
  } catch (err) {
    console.error("getPrompt threw", err);
    return DEFAULTS[key];
  }
}

export async function savePrompt(
  key: PromptKey,
  value: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("admin_config")
    .upsert(
      { key: `prompt:${key}`, value, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  if (error) {
    console.error("savePrompt failed", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export function getPromptDefault(key: PromptKey): string {
  return DEFAULTS[key];
}
