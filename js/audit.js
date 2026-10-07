/**
 * AgentGuard audit log: a SHA-256 hash chain.
 * Each entry stores the hash of the previous entry, so editing any entry
 * invalidates it and every entry after it.
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.AgentGuardAudit = api;
})(typeof self !== "undefined" ? self : globalThis, function (root) {
  "use strict";

  const GENESIS = "GENESIS";

  /** SHA-256 hex digest. Falls back to a non-cryptographic hash only if WebCrypto is missing. */
  async function sha256(text) {
    try {
      const subtle = (root.crypto && root.crypto.subtle) || require("crypto").webcrypto.subtle;
      const buf = await subtle.digest("SHA-256", new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
    } catch (e) {
      let h = 2166136261;
      for (const c of text) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
      return (h >>> 0).toString(16).padStart(8, "0").repeat(8);
    }
  }

  const payload = (e) => [e.n, e.time, e.action, e.decision, e.rule, e.prev].join("|");

  /** Append a new entry to the log (mutates and returns the log). */
  async function append(log, { action, decision, rule, time }) {
    const prev = log.length ? log[log.length - 1].hash : GENESIS;
    const entry = {
      n: log.length + 1,
      time: time || new Date().toLocaleTimeString(),
      action, decision, rule, prev,
    };
    entry.hash = await sha256(payload(entry));
    log.push(entry);
    return log;
  }

  /** Verify the whole chain. Returns the index of the first bad entry, or -1 if intact. */
  async function verify(log) {
    let prev = GENESIS;
    for (let i = 0; i < log.length; i++) {
      const e = log[i];
      if (e.prev !== prev || (await sha256(payload(e))) !== e.hash) return i;
      prev = e.hash;
    }
    return -1;
  }

  return { GENESIS, sha256, append, verify };
});
