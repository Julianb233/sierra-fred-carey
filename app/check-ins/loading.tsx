import { Skeleton } from "@/components/ui/skeleton";

export default function CheckInsLoading() {
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-800"
          >
            <div className="flex justify-between mb-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
