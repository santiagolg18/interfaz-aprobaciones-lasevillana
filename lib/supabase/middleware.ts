import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

const PUBLIC_PATHS = ["/login"];

// Rutas permitidas para el rol `approver` (además de /facturas/[id] que tiene
// guard propio en la página).
const APPROVER_ALLOWED = ["/mis-aprobaciones"];

// Rutas solo para admin.
const ADMIN_ONLY = ["/configuracion"];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;
  let authNetworkError = false;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    authNetworkError = true;
    console.warn("middleware: supabase.auth.getUser failed (treating as transient)", err);
  }

  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // En blip de red: permitir el request actual. Los guards de página (getCurrentUser)
  // reintentan y la RLS/route handlers son la siguiente línea de defensa.
  if (authNetworkError) {
    return response;
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user) {
    let profile: { role: string | null; is_active: boolean | null } | null = null;
    let profileNetworkError = false;
    try {
      const { data } = await supabase
        .from("approvers")
        .select("role, is_active")
        .or(`auth_user_id.eq.${user.id},email.eq.${user.email ?? ""}`)
        .maybeSingle();
      profile = data;
    } catch (err) {
      profileNetworkError = true;
      console.warn("middleware: approvers lookup failed (treating as transient)", err);
    }

    if (profileNetworkError) {
      return response;
    }

    const role = profile?.is_active === false ? null : (profile?.role ?? null);

    if (pathname === "/login") {
      const url = request.nextUrl.clone();
      url.search = "";
      if (role === "approver") url.pathname = "/mis-aprobaciones";
      else if (role === "admin" || role === "purchasing") url.pathname = "/facturas";
      else {
        await supabase.auth.signOut();
        url.pathname = "/login";
        url.searchParams.set("error", "Sin acceso a la aplicación");
        return NextResponse.redirect(url);
      }
      return NextResponse.redirect(url);
    }

    if (!role && !isPublic) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("error", "Sin acceso a la aplicación");
      return NextResponse.redirect(url);
    }

    if (role === "approver") {
      const allowed =
        startsWithAny(pathname, APPROVER_ALLOWED) ||
        pathname.startsWith("/facturas/"); // detalle, con guard en la page
      if (!allowed) {
        const url = request.nextUrl.clone();
        url.pathname = "/mis-aprobaciones";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }

    if (role === "purchasing" && startsWithAny(pathname, ADMIN_ONLY)) {
      const url = request.nextUrl.clone();
      url.pathname = "/facturas";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
