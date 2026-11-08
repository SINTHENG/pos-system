import { cn } from "@/lib/utils";

const GRADIENTS = [
  "from-indigo-400 to-violet-500",
  "from-sky-400 to-cyan-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
];

export function ProductImage({
  name,
  imageUrl,
  className,
}: {
  name: string;
  imageUrl?: string;
  className?: string;
}) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt={name} className={cn("object-cover", className)} />;
  }
  const g = GRADIENTS[name.charCodeAt(0) % GRADIENTS.length];
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-gradient-to-br text-2xl font-bold text-white",
        g,
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
