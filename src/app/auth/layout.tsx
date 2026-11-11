import { ThemeControl } from "@/components/theme-control";
import Link from "next/link";
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="auth-shell">
      <div className="auth-brand-row">
        <Link className="brand" href="/">
          FinTrack.
        </Link>
        <ThemeControl />
      </div>
      {children}
    </main>
  );
}
