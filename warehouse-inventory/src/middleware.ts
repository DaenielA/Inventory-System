import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const publicRoutes = ["/login"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = publicRoutes.some((r) => pathname.startsWith(r));

  if (!req.auth && !isPublic) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (req.auth && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)"],
};
