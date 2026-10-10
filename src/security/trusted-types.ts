/**
 * The Trusted Types "default" policy, run before any other script (an inline
 * script in the layout head, pinned by CSP hash).
 *
 * With `require-trusted-types-for 'script'`, a plain string can no longer
 * reach a sink that turns text into code. Strings that still do (MapLibre
 * creates its worker from a blob: URL string) pass through this policy:
 *   script URLs  this origin (its own blob: URLs included); and the hosting
 *                platform's toolbar loader (https://vercel.live), which is let
 *                through here only so that its module does not throw and stop
 *                the app from starting: the CSP (script-src 'self') still
 *                refuses to load it. Any other origin is refused.
 *   HTML         refused (the app renders text through React, never HTML)
 *   script text  refused
 * Kept as a string so the layout can inline it and the build can hash it.
 */
export const TRUSTED_TYPES_BOOT =
  "if(window.trustedTypes&&trustedTypes.createPolicy){trustedTypes.createPolicy('default',{" +
  "createScriptURL:function(u){var x=new URL(u,location.href);if(x.origin===location.origin||x.origin==='https://vercel.live')return u;throw new TypeError('Trusted Types: script URL from another origin refused')}," +
  "createHTML:function(){throw new TypeError('Trusted Types: HTML string refused')}," +
  "createScript:function(){throw new TypeError('Trusted Types: script string refused')}})}";
