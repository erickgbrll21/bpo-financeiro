import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { supabasePublico } from "@/lib/supabase/env";

export async function createClient() {
  // O auth do supabase-js lê Date.now(); fora da pré-renderização o Next aceita.
  await connection();
  const cookieStore = await cookies();
  const publico = supabasePublico();
  if (!publico) return null;
  const { url, key } = publico;

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component sem permissão de escrita. O middleware renova a sessão.
        }
      },
    },
  });
}
