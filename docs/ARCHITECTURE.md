# Architecture

## Modules

| File | Responsibility | Touches DOM? |
|------|----------------|--------------|
| `js/engine.js` | `evaluate(action, policy)` returns permission, risk score, policy result and verdict | No |
| `js/audit.js` | `append(log, entry)` and `verify(log)` for the SHA-256 hash chain | No |
| `js/app.js` | Renders the five sections, animates the checks, handles the human-review step | Yes |

`engine.js` and `audit.js` are written as UMD-style modules: they attach to `window` in the browser and `module.exports` in Node. That is why the same files are unit-tested by `tests/run.js` and loaded by `index.html` with plain `<script>` tags (so the demo works by double-click, with no server).

## Decision flow

1. **Permission**: is the action's tool in the agent's allowed list? If not, DENY.
2. **Hard rules**: email to a recipient not on the allowed list is DENY regardless of score.
3. **Risk score** = base risk of the action
   - +25 if paying a non-trusted recipient
   - +25 if the amount is over the owner's limit
   - +50 if a hidden instruction (prompt injection) is detected
   - +50 if emailing a non-allowed address
   - capped at 100
4. **Verdict** from score: below 40 ALLOW, 40 to 79 HUMAN REVIEW, 80 or more DENY.
5. **Audit**: the final outcome (including the human's choice) is appended to the hash chain.

## Audit chain

Each entry hashes `n | time | action | decision | rule | previousHash`. `verify` recomputes every hash and checks each entry's `prev` against the prior entry's hash, returning the index of the first mismatch.

## Known limits of the demo

- The log lives in memory and resets on page reload.
- Prompt-injection detection is flagged by the demo scenario, not detected by a real classifier.
- If WebCrypto is unavailable the code falls back to a non-cryptographic hash; this does not happen in normal browsers.
