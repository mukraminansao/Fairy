import { BackLink } from "../back-link";
import Link from "next/link";
import { currentUser } from "@/server/auth";
import { readCart } from "@/server/commerce";
import { Header } from "../header";
import { CartSummary } from "../account/collections";
import { GuestCheckout } from "./guest";
import styles from "../account/account.module.css";

export const metadata = { title: "Demo checkout | FAIRY" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await currentUser();
  return <>
    <Header active="" query="" />
    <main id="main" className={styles.page}>
      <BackLink href={user ? "/account" : "/shop"} />
      <p className={styles.kicker}>Review your bag</p>
      <h1>Demo checkout</h1>
      <p className={styles.notice}><strong>Demo — no payment will be taken.</strong> Review your items here. Delivery and returns will be available when the store opens.</p>
      <section className={styles.panel} aria-labelledby="checkout-bag">
        <h2 id="checkout-bag">{user ? "Account bag" : "Guest bag"}</h2>
        {user ? <CartSummary cart={await readCart(user.id)} /> : <GuestCheckout />}
      </section>
      <div className={styles.actions}>
        <Link className={styles.button} href="/shop">Continue shopping</Link>
        <Link className={styles.button + " " + styles.outline} href="/account">{user ? "Manage your account bag" : "Open FAIRY account"}</Link>
      </div>
    </main>
  </>;
}

