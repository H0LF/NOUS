import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-nous-bg text-nous-primary space-y-4">
      <h2 className="text-4xl font-bold text-nous-accent">404</h2>
      <p className="text-nous-secondary">Could not find requested resource</p>
      <Link href="/app/calendar">
        <Button>Return to App</Button>
      </Link>
    </div>
  );
}
