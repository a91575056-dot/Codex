"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Landmark,
  Repeat,
  Upload,
  PlusCircle,
  Target,
  FlaskConical,
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  ChartNoAxesCombined,
  ChartPie,
  FileText,
  Settings,
  ShieldCheck,
  ArrowUpRight,
  Menu,
  X,
} from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { Button } from "./ui/button";
import { PullToRefresh } from "./pull-to-refresh";
const links = [
  ["/", "Panou de control", LayoutDashboard],
  ["/goals", "Obiective", Target],
  ["/decision-lab", "Laborator de decizii", FlaskConical],
  ["/quick-expense", "Cheltuială rapidă", PlusCircle],
  ["/transactions", "Tranzacții", ArrowLeftRight],
  ["/transfers", "Transferuri", ArrowLeftRight],
  ["/debts", "Datorii de primit", Wallet],
  ["/recurring", "Recurente", Repeat],
  ["/import", "Import CSV", Upload],
  ["/budgets", "Bugete", Wallet],
  ["/investments", "Investiții", ChartNoAxesCombined],
  ["/analytics", "Analize", ChartPie],
  ["/reports", "Rapoarte", FileText],
  ["/settings", "Setări", Settings],
] as const;
export function Shell({
  children,
  demo = true,
  email,
  profileName,
  prefix = "",
}: {
  children: React.ReactNode;
  demo?: boolean;
  email?: string;
  profileName?: string;
  prefix?: string;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const background = useRef<HTMLDivElement>(null);
  const bottomBar = useRef<HTMLElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");
    let start: { x: number; y: number; time: number } | null = null;
    const begin = (event: TouchEvent) => {
      start = null;
      if (!media.matches || event.touches.length !== 1) return;
      const target = event.target as HTMLElement;
      if (
        target.closest(
          "input, textarea, select, [contenteditable], [data-no-swipe]",
        )
      )
        return;
      const touch = event.touches[0];
      // Leave the outermost edge to Safari's system back gesture.
      if (!open && (touch.clientX < 16 || touch.clientX > 40)) return;
      start = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    };
    const end = (event: TouchEvent) => {
      if (!start || event.changedTouches.length !== 1) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (
        Date.now() - start.time < 700 &&
        Math.abs(dx) > 70 &&
        Math.abs(dx) > Math.abs(dy) * 2
      ) {
        if (open && dx < 0) setOpen(false);
        if (!open && dx > 0) setOpen(true);
      }
      start = null;
    };
    const cancel = () => {
      start = null;
    };
    const resize = () => {
      if (!media.matches) setOpen(false);
    };
    document.addEventListener("touchstart", begin, { passive: true });
    document.addEventListener("touchend", end, { passive: true });
    document.addEventListener("touchcancel", cancel);
    media.addEventListener("change", resize);
    return () => {
      document.removeEventListener("touchstart", begin);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", cancel);
      media.removeEventListener("change", resize);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const content = background.current;
    const tabs = bottomBar.current;
    const trigger = menuButton.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (content) content.inert = true;
    if (tabs) tabs.inert = true;
    sidebar.current?.querySelector<HTMLElement>("button")?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab") return;
      const items = sidebar.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      if (!items?.length) return;
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.body.style.overflow = previous;
      if (content) content.inert = false;
      if (tabs) tabs.inert = false;
      document.removeEventListener("keydown", keyboard);
      trigger?.focus();
    };
  }, [open]);
  const home = prefix || "/";
  const transactions = `${prefix}/transactions`;
  return (
    <>
      <PullToRefresh disabled={open} />
      <a className="skip-link" href="#main">
        Sari la conținut
      </a>
      <div className="mobile-bar">
        <Link href={prefix || "/"} className="brand">
          <Landmark /> FinTrack.
        </Link>
        <Button
          ref={menuButton}
          variant="outline"
          size="icon"
          aria-label={open ? "Închide meniul" : "Deschide meniul"}
          aria-expanded={open}
          aria-controls="sidebar"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      {open && (
        <button
          className="overlay"
          aria-label="Închide meniul"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        ref={sidebar}
        id="sidebar"
        className={`sidebar ${open ? "open" : ""}`}
        role={open ? "dialog" : undefined}
        aria-modal={open || undefined}
        aria-label="Meniul FinTrack"
      >
        <button
          className="drawer-close"
          aria-label="Închide meniul"
          onClick={() => setOpen(false)}
        >
          <X size={20} />
        </button>
        <Link href={prefix || "/"} className="brand">
          <span className="brand-icon">
            <Landmark size={23} />
          </span>
          FinTrack<span className="brand-dot">.</span>
        </Link>
        <p className="gesture-hint">Glisează spre stânga pentru a închide</p>
        <p className="nav-label">SPAȚIUL TĂU FINANCIAR</p>
        <nav aria-label="Navigare principală">
          {links.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={
                [
                  "/quick-expense",
                  "/transfers",
                  "/debts",
                  "/recurring",
                  "/import",
                ].includes(href)
                  ? href
                  : prefix + (href === "/" ? "" : href) || "/"
              }
              aria-current={
                path === (prefix + (href === "/" ? "" : href) || "/")
                  ? "page"
                  : undefined
              }
              onClick={(event) => {
                if (
                  href === "/" &&
                  !event.ctrlKey &&
                  !event.metaKey &&
                  !event.shiftKey &&
                  !event.altKey
                ) {
                  event.preventDefault();
                  if (
                    window.location.pathname === home &&
                    !window.location.search &&
                    !window.location.hash
                  ) {
                    window.scrollTo(0, 0);
                    window.location.reload();
                  } else window.location.assign(home);
                } else setOpen(false);
              }}
              className={`nav-link ${path === (prefix + (href === "/" ? "" : href) || "/") ? "active" : ""}`}
            >
              <Icon size={19} />
              {label}
              {path === (prefix + (href === "/" ? "" : href) || "/") && (
                <span className="active-dot" />
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-note">
            <ShieldCheck size={23} />
            <strong>
              {demo ? "Un spațiu de explorare" : "Spațiul tău personal"}
            </strong>
            <p>
              {demo
                ? "Descoperă FinTrack cu date fictive, fără conturi conectate."
                : "Tranzacțiile tale sunt salvate în contul autentificat."}
            </p>
            <Link href={prefix + "/settings"}>
              {demo ? "Despre modul demo" : "Despre cont"}{" "}
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="profile">
            <span className="avatar">{demo ? "AD" : "CP"}</span>
            <div>
              <strong>
                {demo ? "Alex Demo" : profileName || "Cont personal"}
              </strong>
              <small className="profile-email">
                {demo ? "Cont demonstrativ" : email}
              </small>
            </div>
            <i />
          </div>
        </div>
      </aside>
      <div ref={background} className="main-shell">
        <header className="topbar">
          <span>Finanțele tale, în perspectivă.</span>
          <span className="demo-pill">
            <i /> {demo ? "Mod demonstrativ" : "Cont autentificat"}
          </span>
        </header>
        {!demo && (
          <div className="session-bar">
            <Link href="/demo">Explorează DEMO separat</Link>
            <form action={signOut}>
              <Button variant="outline">Deconectare</Button>
            </form>
          </div>
        )}
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <footer>
          FinTrack © 2026
          <span>
            Proiect de licență ·{" "}
            {demo ? "Toate datele sunt fictive" : "Date personale"}
          </span>
        </footer>
      </div>
      <nav ref={bottomBar} className="mobile-tabs" aria-label="Acces rapid">
        <a
          href={home}
          aria-current={path === home ? "page" : undefined}
          onClick={(event) => {
            if (
              event.ctrlKey ||
              event.metaKey ||
              event.shiftKey ||
              event.altKey
            )
              return;
            event.preventDefault();
            if (
              window.location.pathname === home &&
              !window.location.search &&
              !window.location.hash
            ) {
              window.scrollTo(0, 0);
              window.location.reload();
            } else window.location.assign(home);
          }}
        >
          <LayoutDashboard size={21} />
          <span>Panou</span>
        </a>
        <Link
          href={transactions}
          aria-current={path === transactions ? "page" : undefined}
        >
          <ArrowLeftRight size={21} />
          <span>Tranzacții</span>
        </Link>
        <Link
          href="/quick-expense"
          className="capture-tab"
          aria-current={path === "/quick-expense" ? "page" : undefined}
        >
          <PlusCircle size={23} />
          <span>Cheltuială</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Deschide meniul"
          aria-expanded={open}
          aria-controls="sidebar"
        >
          <Menu size={21} />
          <span>Meniu</span>
        </button>
      </nav>
    </>
  );
}
