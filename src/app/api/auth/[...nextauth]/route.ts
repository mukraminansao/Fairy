import { authenticationConfigured, handlers } from "../../../../server/auth";

export const runtime = "nodejs";

function unavailable() {
  return Response.json({ error: { code: "AUTH_UNAVAILABLE", message: "Account sign-in has not been configured." } }, { status: 503 });
}

export const GET: typeof handlers.GET = async (request) => authenticationConfigured() ? handlers.GET(request) : unavailable();
export const POST: typeof handlers.POST = async (request) => authenticationConfigured() ? handlers.POST(request) : unavailable();
