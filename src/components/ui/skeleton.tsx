import { cn } from "./utils";

type SkeletonVariant = "shimmer" | "pulse";

function Skeleton({
  className,
  variant = "shimmer",
  ...props
}: React.ComponentProps<"div"> & { variant?: SkeletonVariant }) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-md",
        variant === "shimmer" ? "skeleton-shimmer" : "bg-accent animate-pulse",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
