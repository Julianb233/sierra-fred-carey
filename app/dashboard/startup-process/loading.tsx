import { Loader2 } from "lucide-react";

export default function StartupProcessLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#ff6a1a] mx-auto mb-4" />
        <p className="text-muted-foreground">Loading startup process...</p>
      </div>
    </div>
  );
}
