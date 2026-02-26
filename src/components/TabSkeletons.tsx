import { Skeleton } from "@/components/ui/skeleton";

/** Card-list skeleton — used for Bills, Lobbying, Court Cases, Calendar, Federal Register, News */
export function CardListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-4 w-12 rounded" />
          </div>
          <Skeleton className="h-5 w-3/4 rounded" />
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-2/3 rounded" />
        </div>
      ))}
    </div>
  );
}

/** Committee skeleton — larger cards with member lists */
export function CommitteeSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-3">
          <Skeleton className="h-5 w-2/3 rounded" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-14 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
          <Skeleton className="h-3 w-full rounded" />
        </div>
      ))}
    </div>
  );
}

/** News skeleton — cards with image thumbnails */
export function NewsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4 flex gap-3">
          <Skeleton className="h-16 w-24 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-12 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
            <Skeleton className="h-5 w-full rounded" />
            <Skeleton className="h-3 w-3/4 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Overview analysis skeleton */
export function AnalysisSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-1/3 rounded" />
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-5/6 rounded" />
      <Skeleton className="h-6 w-1/4 rounded mt-4" />
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-4/5 rounded" />
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-2/3 rounded" />
    </div>
  );
}

/** Midterm race skeleton */
export function MidtermSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-4 w-14 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>
        <Skeleton className="h-6 w-1/2 rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <div className="grid gap-3 sm:grid-cols-2 mt-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
