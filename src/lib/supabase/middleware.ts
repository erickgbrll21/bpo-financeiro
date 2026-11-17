import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublico } from "@/lib/supabase/env";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = supabasePublico();
  if (!config) return response;
  const { url, key } = config;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const rotaPublica = request.nextUrl.pathname.startsWith("/login");
  if (!data.user && !rotaPublica) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    return NextResponse.redirect(destino);
  }
  if (data.user && rotaPublica) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/";
    return NextResponse.redirect(destino);
  }
  return response;
}
