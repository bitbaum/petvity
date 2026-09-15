import { clientIp } from "limitkit";

/**
 * This app's rate-limiting POLICY. The mechanism is `limitkit`.
 *
 * What used to live here was a hand-rolled fixed-window limiter over a
 * module-level `Map` — one of twelve near-identical copies the fleet was
 * carrying (fleet/SHARED.md). The window arithmetic, the refusal shape and the
 * client-IP dance are now the package's problem. What stays local is the only
 * part that was ever ours: how many requests each route allows (declared at the
 * route, next to the reason), and how many proxies sit in front of us.
 *
 * Scope, unchanged and still worth stating: the store is per-process. The app
 * runs as a single systemd service, so one process is the whole picture today;
 * run it with N workers and the effective limit multiplies by N. It exists to
 * stop a trivial script from draining a seller's stock through the
 * unauthenticated checkout, not to stop a determined attacker with many IPs.
 */

/**
 * Best-effort client identity for keying a limiter.
 *
 * `trustedProxies: 1` is limitkit's default and the right value here: Caddy on
 * the box is the single reverse proxy in front of Next, so the LAST entry of
 * `X-Forwarded-For` is the one Caddy wrote and the only one a caller cannot
 * forge. Said once, here, rather than at three call sites — it is a fact about
 * our deployment, and it changes the day a CDN is put in front.
 *
 * The implementation this replaced read the FIRST entry — the same bug limitkit
 * itself shipped with until v0.2.0, and the same one found in three sibling
 * repos. A proxy APPENDS to the header, so the first entry is whatever the
 * client sent. Any caller could vary `X-Forwarded-For` per request, mint a
 * fresh bucket each time and never trip the limit at all: the guest checkout
 * was effectively unlimited. A limiter that cannot be tripped is not a limiter.
 */
export function clientKey(req: Request): string {
  return clientIp(req.headers);
}
