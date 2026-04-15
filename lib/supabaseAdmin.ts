import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
  );
}

export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessageRow = {
  id: string;
  session_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
};

export type ChatSessionRow = {
  id: string;
  anon_user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};
