/**
 * The switch-and-label row used wherever a form has a single on/off decision.
 *
 * It is one component rather than three copies of the markup because the visual
 * is built from a `peer` checkbox plus two absolutely-positioned divs: get the
 * offsets or the `peer-checked:` selectors even slightly wrong in one copy and
 * the knob detaches from the track, which is invisible until someone toggles it.
 */
export function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** The clickable text beside the switch. A node, so callers can prefix an icon. */
  label: React.ReactNode;
  description?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-10 h-5 bg-[var(--border)] rounded-full transition-colors peer-checked:bg-[var(--teal)]" />
        <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-5" />
      </div>
      <div>
        <span className="text-sm font-medium text-[var(--ink2)]">{label}</span>
        {description ? <p className="text-xs text-[var(--muted)]">{description}</p> : null}
      </div>
    </label>
  );
}
