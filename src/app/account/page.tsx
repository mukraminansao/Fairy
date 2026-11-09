import { BackLink } from "../back-link";
import { AuthError } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authenticationConfigured, currentUser, developmentSignInEnabled, oidcSignInEnabled, signIn, signOut } from "@/server/auth";
import { listLooks, readCart } from "@/server/commerce";
import { database } from "@/server/database";
import { Header } from "../header";
import { AccountCollections } from "./collections";
import styles from "./account.module.css";

export const metadata = { title: "Your account | FAIRY" };
export const dynamic = "force-dynamic";

async function signInLocally(form: FormData) {
  "use server";
  if (!authenticationConfigured() || !developmentSignInEnabled()) redirect("/account");
  try {
    await signIn("credentials", { email: form.get("email"), password: form.get("password"), redirectTo: "/account" });
  } catch (error) {
    if (error instanceof AuthError) redirect("/account?error=sign-in");
    throw error;
  }
}

async function signInWithProvider() {
  "use server";
  if (!authenticationConfigured() || !oidcSignInEnabled()) redirect("/account");
  await signIn("fairy-oidc", { redirectTo: "/account" });
}

async function leaveAccount() {
  "use server";
  if (authenticationConfigured()) await signOut({ redirectTo: "/account" });
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await currentUser();
  const error = (await searchParams).error;
  const account = user ? await Promise.all([
    readCart(user.id), listLooks(user.id, 50),
    database().productVariant.findMany({ where: { isActive: true, product: { status: "ACTIVE" } }, select: { id: true, options: true } }),
  ]) : null;

  const initialAccount = user && account ? { name: user.name, cart: account[0] } : null;
  return (
    <>
      <Header active="" query="" initialAccount={initialAccount} />
      <main id="main" className={styles.page}>
        <BackLink href="/" />
        <p className={styles.kicker}>The FAIRY wardrobe</p>
        <h1>Your account</h1>
        {user && account ? <>
          <p className={styles.intro}>Welcome, {user.name ?? user.email}. Your account bag and studio looks are available here.</p>
          <div className={styles.actions}>
            <Link className={styles.button} href="/shop">Explore the shop</Link>
            {user.role !== "CUSTOMER" && <Link className={styles.button + " " + styles.outline} href="/admin">Catalog tools</Link>}
            <form action={leaveAccount}><button className={styles.button + " " + styles.outline}>Sign out</button></form>
          </div>
          <AccountCollections
            cart={account[0]}
            looks={account[1].results.map(({ id, name, kind, items }) => ({ id, name, kind, items: items.map(({ productName, productId, variantId, configuration }) => ({ productName, productId, variantId, configuration })) }))}
            variantIds={Object.fromEntries(account[2].flatMap(({ id, options }) =>
              options && typeof options === "object" && !Array.isArray(options) && typeof options.key === "string" ? [[options.key, id]] : []))}
          />
        </> : <>
          <p className={styles.intro}>Sign in to keep your bag and studio looks together. You can still browse and use the studios as a guest.</p>
          <section className={styles.panel + " " + styles.narrow} aria-labelledby="sign-in-heading">
            <h2 id="sign-in-heading">Sign in</h2>
            {error && <p className={styles.error} role="alert">We couldn’t sign you in. Check your details and try again.</p>}
            {authenticationConfigured() && developmentSignInEnabled() && <form className={styles.form} action={signInLocally}>
              <p className={styles.muted}>Use your local FAIRY test account.</p>
              <label className={styles.field}>Email<input type="email" name="email" autoComplete="username" maxLength={254} required /></label>
              <label className={styles.field}>Password<input type="password" name="password" autoComplete="current-password" maxLength={256} required /></label>
              <button className={styles.button}>Sign in</button>
            </form>}
            {authenticationConfigured() && oidcSignInEnabled() && <form className={styles.actions} action={signInWithProvider}>
              <button className={styles.button}>Continue with sign-in provider</button>
            </form>}
            {!authenticationConfigured() && <p className={styles.intro}>Account sign-in is unavailable in this preview.</p>}
            <div className={styles.actions}><Link className={styles.button + " " + styles.outline} href="/shop">Continue as guest</Link></div>
          </section>
        </>}
      </main>
    </>
  );
}

