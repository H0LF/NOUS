import { Spinner } from "@/components/ui/Spinner";

export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-nous-bg">
      <Spinner size="lg" />
    </div>
  );
}
