"use client";

import { useEffect, useRef, useState } from "react";
import Form from "next/form";
import Image from "next/image";
import Link from "next/link";
import { formatPrice, money, productHref, productVariants, worldHref, worlds } from "./catalog";
import { Icon } from "./ui-icon";
import { BagOption } from "./bag-option";
import { bagLine, changeQuantity, removeBagLine, replaceBagOption, restoreBagLine, useShopState } from "./shop-state";
import { accountRequest } from "./account/client-api";
import styles from "./shop.module.css";

const navigation = [
  { id: "home", nav: "Home" },
  { id: "new", nav: "New In" },
  ...["fashion", "makeup", "skincare", "fragrance", "accessories"].map((id) => worlds.find((world) => world.id === id)!),
];
const titles = { menu: "Explore FAIRY", search: "Search", user: "Account", bag: "Your demo bag" };
const drawerAttributes = { "aria-haspopup": "dialog", "aria-controls": "shop-panel" } as const;

type AccountSummary = {
  name: string | null;
  cart: { currency: string; subtotalMinor: number; items: { variantId: string; productName: string; variantName: string; quantity: number; lineTotalMinor: number }[] };
};

function Search({ query, onSubmit, full = false }: { query: string; onSubmit?: () => void; full?: boolean }) {
  return (
    <Form className={styles.search} data-full={full || undefined} role="search" action="/shop" prefetch={false} onSubmit={onSubmit}>
      {full ? <Icon name="search" /> : <button type="submit" aria-label="Submit search"><Icon name="search" /></button>}
      <input key={query} type="search" name="q" aria-label="Search" placeholder="Search"
        enterKeyHint="search" maxLength={100} defaultValue={query} required />
      {full && <button type="submit">Search</button>}
    </Form>
  );
}

function Navigation({ active, onSelect, compact = false }: {
  active: string; onSelect?: () => void; compact?: boolean;
}) {
  return (
    <nav aria-label="Main navigation">
      <ul className={styles.navList}>
        {navigation.map(({ id, nav }) => (
          <li key={id}>
            <Link href={id === "home" ? "/" : worldHref(id)} onNavigate={onSelect}
              aria-current={active === id ? (id === "home" ? "page" : "location") : undefined}>{nav}{compact && <Icon name="right" />}</Link>
          </li>
        ))}
        {compact && <li><Link href="/shop" aria-current={active === "all" ? "page" : undefined}
          onNavigate={onSelect}>All products <Icon name="right" /></Link></li>}
      </ul>
    </nav>
  );
}

export function Header({ active, query, initialAccount = null }: {
  active: string; query: string; initialAccount?: AccountSummary | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogHeading = useRef<HTMLHeadingElement>(null);
  const bagItems = useRef<HTMLDivElement>(null);
  const pendingBagView = useRef<{ scroll: number; signedIn: boolean }>(null);
  const [panel, setPanel] = useState<keyof typeof titles>("menu");
  const [expanded, setExpanded] = useState(false);
  const [removed, setRemoved] = useState<{ key: string; quantity: number; name: string }>();
  const [bagMessage, setBagMessage] = useState<{ text: string; tone: "success" | "error" }>();

  function removeGuestItem(key: string, name: string) {
    const quantity = removeBagLine(key);
    if (quantity) setRemoved({ key, quantity, name });
    setBagMessage(undefined);
  }
  useEffect(() => {
    const view = window.history.state?.fairyRestoreBag;
    if (typeof view?.scroll !== "number") return;
    const frame = requestAnimationFrame(() => {
      window.history.replaceState({ ...window.history.state, fairyRestoreBag: null }, "");
      pendingBagView.current = view;
      setPanel("bag");
      setExpanded(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const drawer = dialog.current;
    if (!expanded || !drawer) return;
    if (!drawer.open) drawer.showModal();
    const target = panel === "search" ? drawer.querySelector("input") : dialogHeading.current;
    target?.focus({ preventScroll: true });
  }, [expanded, panel]);
  const [account, setAccount] = useState<AccountSummary | null>(initialAccount);
  useEffect(() => {
    let active = true;
    let generation = 0;
    function refresh() {
      const request = ++generation;
      void accountRequest<AccountSummary | null>("/session-summary").then((result) => {
        if (active && request === generation) setAccount(result);
      }).catch(() => {});
    }
    refresh();
    window.addEventListener("fairy-account-change", refresh);
    return () => { active = false; window.removeEventListener("fairy-account-change", refresh); };
  }, []);
  const { bag, fashionLook, beautyLook, savedOutfits, savedBeautyLook } = useShopState();
  const bagProducts = Object.entries(bag).flatMap(([key, quantity]) => {
    const line = bagLine(key);
    return line ? [{ key, quantity, ...line }] : [];
  });
  const bagCount = bagProducts.reduce((sum, { quantity }) => sum + quantity, 0);
  const displayBagCount = account ? account.cart.items.reduce((sum, item) => sum + item.quantity, 0) : bagCount;
  const badge = useRef<HTMLSpanElement>(null);
  const previousBagCount = useRef(displayBagCount);
  useEffect(() => {
    const increased = displayBagCount > previousBagCount.current;
    previousBagCount.current = displayBagCount;
    if (!increased || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const pulse = badge.current?.animate([
      { transform: "scale(1)" }, { transform: "scale(1.2)", offset: .42 }, { transform: "scale(1)" },
    ], { duration: 300, easing: "ease-out" });
    return () => pulse?.cancel();
  }, [displayBagCount]);
  const subtotal = bagProducts.reduce((sum, { quantity, product }) => sum + quantity * product.priceCents, 0);
  useEffect(() => {
    const view = pendingBagView.current;
    if (!expanded || panel !== "bag" || !view || view.signedIn !== Boolean(account) || !bagItems.current) return;
    bagItems.current.scrollTop = view.scroll;
    pendingBagView.current = null;
  }, [account, displayBagCount, expanded, panel]);

  function close() {
    dialog.current?.close();
    setExpanded(false);
  }

  function leaveBagForCheckout() {
    window.history.replaceState({
      ...window.history.state,
      fairyRestoreBag: { scroll: bagItems.current?.scrollTop ?? 0, signedIn: Boolean(account) },
    }, "");
    close();
  }

  function open(name: keyof typeof titles) {
    setPanel(name);
    setExpanded(true);
  }
  const bagButton = (
    <button type="button" className={styles.bagButton} aria-label={displayBagCount
      ? "Shopping bag, " + displayBagCount + (displayBagCount === 1 ? " item" : " items") : "Shopping bag"}
      {...drawerAttributes} aria-expanded={expanded && panel === "bag"} onClick={() => open("bag")}>
      <span className={styles.bagIcon}><Icon name="bag" />
        {displayBagCount > 0 && <span ref={badge} aria-hidden="true" className={styles.badge}>{displayBagCount}</span>}
      </span>
      <span aria-hidden="true" className={styles.utilityLabel}>Bag</span>
    </button>
  );

  return (
    <header className={styles.header}>
      <a className={styles.skipLink} href="#main">Skip to content</a>
      <p className={styles.announcement}>A new way to discover your style</p>
      <div className={styles.navbar}>
        <button type="button" className={styles.mobileMenu} aria-label="Open menu" {...drawerAttributes}
          aria-expanded={expanded && panel === "menu"} onClick={() => open("menu")}>
          <span className={styles.menuGlyph} aria-hidden="true"><Icon name="menu" /></span>
        </button>
        <Link href="/" className={styles.wordmark} aria-label="FAIRY home">FAIRY</Link>
        <div className={styles.desktopNav}><Navigation active={active} /></div>
        <div className={styles.desktopSearch}><Search query={query} /></div>
        <div className={styles.utility}>
          {bagButton}
          <button type="button" aria-label="Account" {...drawerAttributes}
            aria-expanded={expanded && panel === "user"} onClick={() => open("user")}><Icon name="user" /><span aria-hidden="true" className={styles.utilityLabel}>Account</span></button>
        </div>
        <button type="button" className={styles.mobileSearch} aria-label="Search" {...drawerAttributes}
          aria-expanded={expanded && panel === "search"} onClick={() => open("search")}><Icon name="search" /><span aria-hidden="true">Search</span></button>
      </div>

      <dialog id="shop-panel" className={styles.dialog} data-site-panel={panel} ref={dialog}
        closedby="any" inert={!expanded} aria-hidden={!expanded || undefined} aria-labelledby="shop-panel-heading"
        onClose={() => setExpanded(Boolean(dialog.current?.open))}
        onCancel={(event) => { event.preventDefault(); close(); }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect();
          if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) close();
        }}>
        <div className={styles.dialogHeader}>
          <h2 id="shop-panel-heading" tabIndex={-1} ref={dialogHeading}>{titles[panel]}</h2>
          <button type="button" aria-label="Close panel" onClick={close}><Icon name="close" /></button>
        </div>
        {panel === "search" && <>
          <Search query={query} onSubmit={close} full />
          <p className={styles.drawerLabel}>Browse by category</p>
          <ul className={styles.searchSuggestions}>
            {worlds.map(({ id, nav }) => <li key={id}><Link href={worldHref(id)} onNavigate={close}>{nav}<Icon name="right" /></Link></li>)}
          </ul>
        </>}
        {panel === "menu" && <>
          <Search query={query} onSubmit={close} />
          <p className={styles.drawerLabel}>Shop by world</p>
          <Navigation active={active} onSelect={close} compact />
          <div className={styles.studioLinks}>
            <p className={styles.drawerLabel}>Try it on</p>
            <Link href={worldHref("looks")} onNavigate={close}>Shop the Look <Icon name="arrow" /></Link>
            <Link href="/studio/fashion" onNavigate={close}>Fitting Room <Icon name="arrow" /></Link>
            <Link href="/studio/beauty" onNavigate={close}>Beauty Studio <Icon name="arrow" /></Link>
          </div>
        </>}
        {panel === "user" && <div className={styles.guestAccount}>
          {account ? <><h3>{account.name ? "Welcome, " + account.name : "Your FAIRY account"}</h3></> : <>
            <h3>Guest profile</h3>
            <p>Your bag and studio looks are stored in this browser.</p>
          </>}
          <ul>
            {!!fashionLook?.ids.length && <li><Link href="/studio/fashion" onNavigate={close}>Continue your outfit <Icon name="right" /></Link></li>}
            {!!beautyLook?.ids.length && <li><Link href="/studio/beauty" onNavigate={close}>Continue your beauty look <Icon name="right" /></Link></li>}
            {!account && <>
              <li><button type="button" onClick={() => setPanel("bag")}>Demo bag ({bagCount}) <Icon name="right" /></button></li>
              <li><Link href="/studio/fashion" onNavigate={close}>Saved outfits ({savedOutfits?.length ?? 0}) <Icon name="right" /></Link></li>
              <li><Link href="/studio/beauty" onNavigate={close}>{savedBeautyLook ? "Open your saved beauty look" : "Open the Beauty Studio"} <Icon name="right" /></Link></li>
            </>}
          </ul>
          <Link className={styles.panelAction} href="/account" onNavigate={close}>Open FAIRY account <Icon name="arrow" /></Link>
        </div>}
        {panel === "bag" && <>
          <div ref={bagItems} className={styles.bagBody} role="region" aria-label="Bag items" tabIndex={displayBagCount ? 0 : undefined}>
            {account ? (
              account.cart.items.length ? <ul className={styles.panelList}>{account.cart.items.map((item) => <li key={item.variantId}>
                <div><strong>{item.productName}</strong><p className={styles.unitPrice}>{item.variantName} · Qty {item.quantity}</p></div>
                <strong>{formatPrice(item.lineTotalMinor, account.cart.currency)}</strong>
              </li>)}</ul> : <p>Your account bag is empty.</p>
            ) : bagProducts.length ? (
              <ul className={styles.panelList}>
                {bagProducts.map(({ key, quantity, product, variant, stock, hasVariant }) => {
                  const label = hasVariant ? product.name + ", " + variant : product.name;
                  return (
                    <li key={key} className={styles.bagItem}>
                      <Image src={product.previewImage} alt="" width={58} height={58} />
                      <div>
                        <Link href={productHref(product.id)} onClick={close}><strong>{product.name}</strong></Link>
                        <p className={styles.unitPrice}>{money(product.priceCents)} each</p>
                        <strong className={styles.lineTotal}>{money(product.priceCents * quantity)}</strong>
                        {quantity > stock && <p className={styles.bagNotice}>This quantity is unavailable. Reduce it or choose another option.</p>}
                        <BagOption product={product.name} value={key}
                          options={productVariants(product).map((option) => ({ id: option.key, name: option.name ?? "Standard",
                            available: quantity + (option.key === key ? 0 : bag[option.key] ?? 0) <= option.stock }))}
                          onChange={(to) => setBagMessage(replaceBagOption(key, to)
                            ? { text: "Bag option updated.", tone: "success" }
                            : { text: "That option has insufficient stock. Your current selection is still in the bag.", tone: "error" })} />
                      </div>
                      <div className={styles.bagControls}>
                        <div className={styles.quantity}>
                          <button type="button" aria-label={"Decrease quantity of " + label} onClick={() => quantity === 1 ? removeGuestItem(key, product.name) : changeQuantity(key, -1)}>−</button>
                          <span aria-label="Quantity">{quantity}</span>
                          <button type="button" aria-label={"Increase quantity of " + label} disabled={quantity >= stock}
                            onClick={() => changeQuantity(key, 1)}>+</button>
                        </div>
                        <button type="button" aria-label={"Remove " + label + " from bag"} onClick={() => removeGuestItem(key, product.name)}>Remove</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : <p>Your bag is empty.</p>}
          </div>
          <div className={styles.bagFooter}>
            {!account && (removed || bagMessage) && <div className={styles.bagFeedback}>
              <p role="status" data-tone={bagMessage?.tone}>{bagMessage?.text ?? (removed ? removed.name + " removed." : "")}</p>
              {removed && <button type="button" onClick={() => {
                const restored = restoreBagLine(removed.key, removed.quantity);
                setBagMessage(restored
                  ? { text: removed.name + " restored.", tone: "success" }
                  : { text: "That quantity is unavailable. The rest of your bag is ready.", tone: "error" });
                if (restored) setRemoved(undefined);
              }}>Undo removal</button>}
            </div>}
            <p className={styles.subtotal} aria-live="polite">Subtotal <strong>
              {account ? formatPrice(account.cart.subtotalMinor, account.cart.currency) : money(subtotal)}
            </strong></p>
            {displayBagCount > 0 ? <Link className={styles.panelAction} href="/checkout" onNavigate={leaveBagForCheckout}>Review demo checkout <Icon name="arrow" /></Link>
              : <Link className={styles.panelAction} href="/shop" onNavigate={close}>Continue shopping <Icon name="arrow" /></Link>}
            {account ? <Link className={styles.manageBag} href="/account" onNavigate={close}>Manage account bag</Link>
              : <p className={styles.bagCurrency}>Guest bag · Demo prices in USD</p>}
          </div>
        </>}
      </dialog>
    </header>
  );
}
