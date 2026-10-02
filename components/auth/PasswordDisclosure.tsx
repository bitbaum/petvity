/**
 * Email + password stays reachable for accounts created before "Sign in with
 * OrangeCat", but no longer competes with it: a closed disclosure when
 * OrangeCat is offered, the plain content when it is not.
 */
export function PasswordDisclosure({
  collapsible,
  summary,
  children,
}: {
  collapsible: boolean;
  summary: string;
  children: React.ReactNode;
}) {
  if (!collapsible) return <>{children}</>;
  return (
    <details className="mt-5">
      <summary className="cursor-pointer text-center text-sm text-[var(--muted)] hover:text-[var(--teal)] transition-colors">
        {summary}
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}
