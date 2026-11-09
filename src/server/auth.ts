import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { database, databaseConfigured } from "./database";

const localHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
const credentialInput = z.object({ email: z.email().max(254), password: z.string().min(1).max(256) });
const digest = (value: string) => createHash("sha256").update(value).digest();

export function developmentSignInEnabled() {
  const origin = process.env.AUTH_URL;
  if (!origin || process.env.NODE_ENV === "production") return false;
  try {
    return localHosts.has(new URL(origin).hostname) && Boolean(process.env.FAIRY_DEV_AUTH_PASSWORD && process.env.FAIRY_DEV_EMAIL);
  } catch {
    return false;
  }
}

export function oidcSignInEnabled() {
  return Boolean(process.env.AUTH_OIDC_ISSUER && process.env.AUTH_OIDC_CLIENT_ID && process.env.AUTH_OIDC_CLIENT_SECRET);
}

export function authenticationConfigured() {
  return databaseConfigured() && Boolean(process.env.AUTH_URL && process.env.AUTH_SECRET) &&
    (developmentSignInEnabled() || oidcSignInEnabled());
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const dev = developmentSignInEnabled();
  const localProvider = Credentials({
    name: "FAIRY local test account",
    credentials: { email: { type: "email" }, password: { type: "password" } },
    async authorize(value, request) {
      if (!developmentSignInEnabled() || !localHosts.has(new URL(request.url).hostname)) return null;
      const parsed = credentialInput.safeParse(value);
      const password = process.env.FAIRY_DEV_AUTH_PASSWORD;
      const email = process.env.FAIRY_DEV_EMAIL?.toLowerCase();
      if (!parsed.success || !password || !email || parsed.data.email.toLowerCase() !== email ||
        !timingSafeEqual(digest(parsed.data.password), digest(password))) return null;
      return database().user.findUnique({ where: { email }, select: { id: true, name: true, email: true, image: true } });
    },
  });
  return {
    adapter: databaseConfigured() ? PrismaAdapter(database()) : undefined,
    providers: [
      ...(dev ? [localProvider] : []),
      ...(oidcSignInEnabled() ? [{
        id: "fairy-oidc", name: "Your sign-in provider", type: "oidc" as const,
        issuer: process.env.AUTH_OIDC_ISSUER, clientId: process.env.AUTH_OIDC_CLIENT_ID,
        clientSecret: process.env.AUTH_OIDC_CLIENT_SECRET,
      }] : []),
    ],
    trustHost: Boolean(process.env.AUTH_URL),
    session: { strategy: dev ? "jwt" : "database", maxAge: dev ? 3600 : 60 * 60 * 24 * 14 },
    pages: { signIn: "/account" },
    callbacks: {
      session({ session, user, token }) {
        session.user.id = user?.id ?? token?.sub ?? "";
        return session;
      },
    },
  };
});

export async function currentUser() {
  if (!authenticationConfigured()) return null;
  const session = await auth();
  const id = session?.user?.id;
  return id ? database().user.findUnique({
    where: { id }, select: { id: true, email: true, name: true, role: true },
  }) : null;
}
