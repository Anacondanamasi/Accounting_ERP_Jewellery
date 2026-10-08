import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_ROLE_VALUE,
  ROLE_COLUMN,
  ROLE_TABLE,
  ROLE_USER_ID_COLUMN
} from "@/lib/auth/roles";

const AUTH_ROUTES = ["/login", "/signup"];
const USER_HOME_ROUTE = "/dashboard";
const ADMIN_HOME_ROUTE = "/admin";

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isAdminRoute(pathname: string) {
  return pathname === ADMIN_HOME_ROUTE || pathname.startsWith(`${ADMIN_HOME_ROUTE}/`);
}

function isPublicRoute(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/public")
  );
}

function redirect(request: NextRequest, target: string) {
  const url = request.nextUrl.clone();
  url.pathname = target;
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
          if (headers) {
            Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
          }
        }
      }
    }
  );

  const pathname = request.nextUrl.pathname;
  if (isPublicRoute(pathname)) {
    return response;
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return isAuthRoute(pathname) ? response : redirect(request, "/login");
  }

  if (isAuthRoute(pathname)) {
    return redirect(request, USER_HOME_ROUTE);
  }

  if (isAdminRoute(pathname)) {
    const { data, error } = await supabase
      .from(ROLE_TABLE)
      .select(ROLE_COLUMN)
      .eq(ROLE_USER_ID_COLUMN, user.id)
      .maybeSingle();

    const role = error ? "user" : (data?.[ROLE_COLUMN] ?? "user");
    if (role !== ADMIN_ROLE_VALUE) {
      return redirect(request, USER_HOME_ROUTE);
    }
  }

  return response;
}
