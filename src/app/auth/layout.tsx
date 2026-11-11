import Link from "next/link";
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="auth-shell">
      <Link className="brand mb-8" href="/">
        FinTrack.
      </Link>
      {children}
    </main>
  );
}
