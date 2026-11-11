import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (
    token_hash &&
    (type === "email" || type === "recovery") &&
    supabaseConfig()
  ) {
    const client = await createClient();
    const { error } = await client.auth.verifyOtp({
      token_hash,
      type,
    });
    if (!error)
      return NextResponse.redirect(
        new URL(
          type === "recovery" ? "/auth/update-password" : "/",
          request.url,
        ),
      );
  }
  return NextResponse.redirect(
    new URL("/auth/login?error=confirmation", request.url),
  );
}
