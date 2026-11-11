"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Landmark,
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
const links = [
  ["/", "Panou de control", LayoutDashboard],
  ["/decision-lab", "Laborator de decizii", FlaskConical],
  ["/transactions", "Tranzacții", ArrowLeftRight],
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
  prefix = "",
}: {
  children: React.ReactNode;
  demo?: boolean;
  email?: string;
  prefix?: string;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <a className="skip-link" href="#main">
        Sari la conținut
      </a>
      <div className="mobile-bar">
        <Link href={prefix || "/"} className="brand">
          <Landmark /> FinTrack.
        </Link>
        <Button
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
      <aside id="sidebar" className={`sidebar ${open ? "open" : ""}`}>
        <Link href={prefix || "/"} className="brand">
          <span className="brand-icon">
            <Landmark size={23} />
          </span>
          FinTrack<span className="brand-dot">.</span>
        </Link>
        <p className="nav-label">SPAȚIUL TĂU FINANCIAR</p>
        <nav aria-label="Navigare principală">
          {links.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={prefix + (href === "/" ? "" : href) || "/"}
              aria-current={
                path === (prefix + (href === "/" ? "" : href) || "/")
                  ? "page"
                  : undefined
              }
              onClick={() => setOpen(false)}
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
              <strong>{demo ? "Alex Demo" : "Cont personal"}</strong>
              <small className="profile-email">
                {demo ? "Cont demonstrativ" : email}
              </small>
            </div>
            <i />
          </div>
        </div>
      </aside>
      <div className="main-shell">
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
    </>
  );
}
