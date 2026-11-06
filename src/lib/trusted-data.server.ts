import { createClient } from "@supabase/supabase-js";

let trustedClient: ReturnType<typeof createClient> | undefined;

/** Create a server-only service client without treating an opaque key as a JWT. */
export function getTrustedDataClient() {
  if (trustedClient) return trustedClient;

  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Trusted data service is unavailable.");

  trustedClient = createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });

  return trustedClient;
}

export async function replaceCareerMatches(
  userId: string,
  rows: Record<string, unknown>[],
) {
  const db = getTrustedDataClient();
  const { error: deleteError } = await db.from("career_matches").delete().eq("user_id", userId);
  if (deleteError) {
    console.error("[career-matches] replace delete failed", deleteError.message);
    throw new Error("Career recommendations could not be saved. Please try again.");
  }
  if (!rows.length) return;

  const { error: insertError } = await db.from("career_matches").insert(rows as never[]);
  if (insertError) {
    console.error("[career-matches] replace insert failed", insertError.message);
    throw new Error("Career recommendations could not be saved. Please try again.");
  }
}