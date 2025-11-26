

export default function FilterBadge({ count }: { count: number }) {
  if (!count || count <= 0) return null;
  return (
    <span className="h-5 min-w-5 flex items-center justify-center rounded-full bg-primary px-2 text-primary-foreground text-xs font-medium">
      {count}
    </span>
  );
}
