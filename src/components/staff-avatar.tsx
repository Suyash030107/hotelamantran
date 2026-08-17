import { usePhotoUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function StaffAvatar({
  name,
  path,
  className,
}: {
  name: string;
  path?: string | null | undefined;
  className?: string;
}) {
  const { data: url } = usePhotoUrl(path);
  return (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-xs font-semibold text-primary",
        className,
      )}
    >
      {url ? (
        <img src={url} alt={name} className="size-full object-cover" loading="lazy" />
      ) : (
        initials(name || "?")
      )}
    </span>
  );
}
