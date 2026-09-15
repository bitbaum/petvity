import type { ProductCategoryId } from "@/lib/config/products";
import { UploadedImage } from "@/components/ui/UploadedImage";

/**
 * Product visual: the uploaded photo when one exists, otherwise a branded
 * per-category line illustration — so no product ever renders as a bare
 * placeholder box. Server-safe (no hooks); colors come from the design-token
 * CSS vars so the art re-themes with globals.css.
 */

type Props = {
  imageUrl: string | null;
  alt: string;
  category: string;
  /** Applied to the <img>/<svg> itself; the sizing container stays at the call site. */
  className?: string;
};

/* Stroke-based art on a 96×96 grid; stroke 3, round caps. Teal line work,
   terracotta accents — reads at thumbnail and hero sizes alike. */
const CATEGORY_ART: Record<ProductCategoryId, React.ReactNode> = {
  food: (
    <>
      {/* bowl */}
      <path
        d="M22 52h52c0 14-11 24-26 24S22 66 22 52Z"
        fill="var(--teal-light)"
        stroke="var(--teal)"
      />
      <path d="M18 52h60" stroke="var(--teal)" />
      {/* kibble */}
      <circle cx="38" cy="40" r="5" fill="var(--accent-light)" stroke="var(--accent)" />
      <circle cx="54" cy="34" r="5" fill="var(--accent-light)" stroke="var(--accent)" />
      <circle cx="62" cy="44" r="4" fill="var(--accent-light)" stroke="var(--accent)" />
    </>
  ),
  toys: (
    <>
      {/* ball with stitch curves */}
      <circle cx="48" cy="48" r="26" fill="var(--accent-light)" stroke="var(--accent)" />
      <path d="M30 30c8 10 8 26 0 36M66 30c-8 10-8 26 0 36" stroke="var(--accent)" />
      <path d="M36 26c4 3 8 3 12 0M36 70c4-3 8-3 12 0" stroke="var(--teal)" />
    </>
  ),
  health: (
    <>
      {/* capsule */}
      <rect
        x="24"
        y="40"
        width="48"
        height="20"
        rx="10"
        fill="var(--teal-light)"
        stroke="var(--teal)"
        transform="rotate(-20 48 50)"
      />
      <path d="M44 43.5 51 62" stroke="var(--teal)" />
      {/* cross */}
      <path d="M67 26v12M61 32h12" stroke="var(--accent)" />
    </>
  ),
  accessories: (
    <>
      {/* collar */}
      <path d="M26 42c0-10 10-16 22-16s22 6 22 16-4 18-10 20" fill="none" stroke="var(--teal)" />
      <path d="M26 42c0 10 4 18 10 20" fill="none" stroke="var(--teal)" />
      {/* buckle + tag */}
      <rect
        x="42"
        y="60"
        width="12"
        height="8"
        rx="2"
        fill="var(--teal-light)"
        stroke="var(--teal)"
      />
      <circle cx="48" cy="76" r="6" fill="var(--accent-light)" stroke="var(--accent)" />
    </>
  ),
  grooming: (
    <>
      {/* scissors: crossed blades + ring handles */}
      <path d="M40 52 66 22M56 52 30 22" stroke="var(--teal)" />
      <circle cx="36" cy="62" r="9" fill="var(--accent-light)" stroke="var(--accent)" />
      <circle cx="60" cy="62" r="9" fill="var(--accent-light)" stroke="var(--accent)" />
    </>
  ),
  other: (
    <>
      {/* parcel */}
      <rect
        x="26"
        y="34"
        width="44"
        height="36"
        rx="4"
        fill="var(--teal-light)"
        stroke="var(--teal)"
      />
      <path d="M26 46h44M48 34v12" stroke="var(--teal)" />
      <path d="M40 58h16" stroke="var(--accent)" />
    </>
  ),
};

export function ProductArt({ imageUrl, alt, category, className }: Props) {
  if (imageUrl) {
    return <UploadedImage src={imageUrl} alt={alt} className={className} />;
  }
  const art = CATEGORY_ART[category as ProductCategoryId] ?? CATEGORY_ART.other;
  return (
    <svg
      viewBox="0 0 96 96"
      role="img"
      aria-label={alt}
      className={className}
      fill="none"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {art}
    </svg>
  );
}
