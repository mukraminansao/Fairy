import { BackLink } from "../back-link";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { adminProducts } from "@/server/admin";
import { currentUser } from "@/server/auth";
import { Header } from "../header";
import styles from "../account/account.module.css";
import { CatalogTools } from "./tools";

export const metadata = { title: "Catalog tools | FAIRY" };
export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/account");
  if (user.role === "CUSTOMER") notFound();
  const cursor = (await searchParams).cursor;
  const { results, nextCursor } = await adminProducts(20, cursor);
  return <>
    <Header active="" query="" />
    <main id="main" className={styles.page}>
      <BackLink href="/account" />
      <p className={styles.kicker}>FAIRY administration</p>
      <h1>Catalog tools</h1>
      <p className={styles.intro}>{user.role === "ADMIN" ? "Manage demo product status, variant pricing and stock. Changes are logged." : "View the demo catalog and its inventory."}</p>
      {cursor && <div className={styles.actions}><Link href="/admin">First page</Link></div>}
      <CatalogTools canEdit={user.role === "ADMIN"} products={results.map(({ id, name, status, variants }) => ({
        id, name, status,
        variants: variants.map(({ id, sku, name, priceMinor, currency, inventory }) => ({ id, sku, name, priceMinor, currency, onHand: inventory?.onHand ?? null })),
      }))} />
      {nextCursor && <Link className={styles.button} href={"/admin?cursor=" + nextCursor}>Next page</Link>}
    </main>
  </>;
}

