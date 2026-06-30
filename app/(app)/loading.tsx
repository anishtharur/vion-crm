export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-48 animate-pulse rounded-lg bg-surface-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-muted" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-surface-muted" />
    </div>
  );
}
