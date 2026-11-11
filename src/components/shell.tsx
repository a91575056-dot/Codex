"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Landmark,
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
import { Button } from "./ui/button";
const links = [
  ["/", "Panou de control", LayoutDashboard],
  ["/transactions", "Tranzacții", ArrowLeftRight],
  ["/budgets", "Bugete", Wallet],
  ["/investments", "Investiții", ChartNoAxesCombined],
  ["/analytics", "Analize", ChartPie],
  ["/reports", "Rapoarte", FileText],
  ["/settings", "Setări", Settings],
] as const;
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <a className="skip-link" href="#main">
        Sari la conținut
      </a>
      <div className="mobile-bar">
        <Link href="/" className="brand">
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
        <Link href="/" className="brand">
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
              href={href}
              aria-current={path === href ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={`nav-link ${path === href ? "active" : ""}`}
            >
              <Icon size={19} />
              {label}
              {path === href && <span className="active-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-note">
            <ShieldCheck size={23} />
            <strong>Un spațiu de explorare</strong>
            <p>Descoperă FinTrack cu date fictive, fără conturi conectate.</p>
            <Link href="/settings">
              Despre modul demo <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="profile">
            <span className="avatar">AD</span>
            <div>
              <strong>Alex Demo</strong>
              <small>Cont demonstrativ</small>
            </div>
            <i />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>Finanțele tale, în perspectivă.</span>
          <span className="demo-pill">
            <i /> Mod demonstrativ
          </span>
        </header>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <footer>
          FinTrack © 2026
          <span>Proiect de licență · Toate datele sunt fictive</span>
        </footer>
      </div>
    </>
  );
}
