/**
 * A plain `<img>` for a file a person uploaded — pet avatars, adoption photos,
 * product pictures.
 *
 * Why not `next/image`: these URLs are written by the upload routes at request
 * time (`/uploads/...` on the box's local disk, or an `object:` URL while a
 * preview is still in flight). `next/image` would route them through the
 * optimizer, which needs the path to be known at build time or allow-listed by
 * pattern — and a missing pattern fails the whole render rather than the one
 * picture. The optimizer also cannot help: these files are already resized by
 * the upload route.
 *
 * The decision lives here so it is made once. Thirteen components used to carry
 * their own copy of the `<img>` plus its own `eslint-disable` line, which is
 * thirteen places for the reasoning to rot and thirteen exemptions a reviewer
 * has to re-audit.
 */
export function UploadedImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  // eslint-disable-next-line @next/next/no-img-element -- see the note above; this is the one exemption
  return <img src={src} alt={alt} className={className} />;
}
