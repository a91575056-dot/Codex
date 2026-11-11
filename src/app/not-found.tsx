import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1>Pagina nu a fost găsită</h1>
      <p className="my-6 text-muted-foreground">
        Verifică adresa sau revino la panoul de control.
      </p>
      <Button asChild>
        <Link href="/">Înapoi la panoul de control</Link>
      </Button>
    </div>
  );
}
