import "server-only";
import { z } from "zod";
import { Prisma } from "../generated/prisma/client";

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

export const identifier = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
export const pagination = z.object({
  cursor: identifier.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export function data(value: unknown, status = 200, meta?: unknown) {
  return Response.json({ data: value, ...(meta ? { meta } : {}) }, { status, headers: { "Cache-Control": "private, no-store" } });
}

export function failure(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
  if (error instanceof z.ZodError) {
    const fields = Object.fromEntries(error.issues.map((issue) => [issue.path.join(".") || "request", issue.message]));
    return Response.json({ error: { code: "VALIDATION_ERROR", message: "Check the request fields.", fields } }, { status: 422 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002" || error.code === "P2034") {
      return failure(new ApiError(409, "CONFLICT", "This request conflicts with an existing or recently updated record."));
    }
    if (error.code === "P2025") return failure(new ApiError(404, "NOT_FOUND", "The requested record could not be found."));
  }
  console.error("FAIRY API request failed", error instanceof Error ? error.name : typeof error);
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "The request could not be completed." } }, { status: 500 });
}

export function notFound(): never {
  throw new ApiError(404, "NOT_FOUND", "The requested record could not be found.");
}

export function sameOrigin(request: Request) {
  const expected = new URL(process.env.AUTH_URL ?? request.url).origin;
  if (request.headers.get("origin") !== expected) throw new ApiError(403, "ORIGIN_REJECTED", "Use FAIRY from its own origin.");
}

export async function jsonBody(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new ApiError(400, "INVALID_JSON", "Send a JSON request body.");
  }
  const reader = request.body?.getReader();
  const decoder = new TextDecoder();
  let body = "";
  let size = 0;
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) {
        await reader.cancel();
        throw new ApiError(413, "PAYLOAD_TOO_LARGE", "The request body is too large.");
      }
      body += decoder.decode(value, { stream: true });
    }
  }
  try {
    return JSON.parse(body + decoder.decode());
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Send a valid JSON request body.");
  }
}

export function pageOf<T extends { id: string }>(rows: T[], limit: number, cursor?: string) {
  const position = cursor ? rows.findIndex(({ id }) => id === cursor) : -1;
  if (cursor && position === -1) throw new ApiError(422, "INVALID_CURSOR", "The page cursor is no longer available.");
  const results = rows.slice(position + 1, position + 1 + limit);
  return { results, nextCursor: rows.length > position + 1 + limit ? results.at(-1)?.id : undefined };
}
