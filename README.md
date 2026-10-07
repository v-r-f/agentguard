# AgentGuard

> **AI agents may propose actions. AgentGuard decides whether they receive authority to act.**

Built for **DecentraHACK** by **Team SAMANVAY**.

**Live demo:** https://v-r-f.github.io/agentguard/
**Source:** https://github.com/v-r-f/agentguard

---

## The problem

AI agents can now send email, move money and delete data on a person's behalf. Two things go wrong:

1. **Too much authority.** Nothing stops an agent from spending more than the owner intended.
2. **Hijacked agents.** Hidden text in a web page or document (a *prompt injection*) can trick an agent into acting against its owner, for example "send all funds to me".

## The solution

AgentGuard sits between the agent and its tools. The agent only *proposes* an action. AgentGuard examines it, returns a verdict, and records the outcome in a tamper-evident log. Nothing runs without authority.

```
 AI agent  ──proposes──▶  AgentGuard  ──ALLOW──────────▶  Tool / wallet / email
                              │        ──HUMAN REVIEW──▶  Owner approves or rejects
                              │        ──DENY──────────▶  Blocked
                              ▼
                  SHA-256 hash-chained audit log
```

### The five checks

| # | Check | Question it answers |
|---|-------|---------------------|
| 1 | Identity | Is this a verified agent? |
| 2 | Permissions | Is this agent allowed to use this tool? |
| 3 | Policy | Does it follow the owner's rules (spending limit, allowed recipients, trusted payees)? |
| 4 | Risk | How dangerous is it, scored 0 to 100? |
| 5 | Simulation | What would happen on a test network before it runs for real? |

### Verdicts

| Risk score | Verdict |
|-----------|---------|
| Below 40 | **ALLOW** |
| 40 to 79 | **HUMAN REVIEW** (owner approves or rejects) |
| 80 and above | **DENY** |

Hard rules override the score: no tool permission, or an email to a recipient that is not on the allowed list, is denied outright.

### Tamper-evident audit record

Every decision is logged with the SHA-256 hash of the previous entry. Editing any entry breaks the chain from that point on, and **Verify record** shows exactly where. In the full product, the latest fingerprint is anchored on a blockchain so the history cannot be quietly rewritten.

## Try it (60 seconds)

1. Move the **spending limit** slider and tick or untick email recipients.
2. Pick an action. Try **Pay $200 to trusted Vendor A**, then **Pay $800 to a new wallet**, then the **hidden text** injection attack.
3. Watch the five checks run and read the verdict.
4. Change the rules and run the **same action again** to see the verdict change.
5. Press **Attempt to tamper with entry 1**, then **Verify record**.

## Setup and run

**Requirements:** any modern browser. No install, no build step, no backend.

```bash
git clone https://github.com/v-r-f/agentguard.git
cd agentguard
open index.html          # Mac
start index.html         # Windows
xdg-open index.html      # Linux
```

Or double-click `index.html`. To serve it locally instead:

```bash
npx serve .              # then open the printed URL
```

### Run the tests

Requires Node.js 18 or newer. There are no dependencies to install.

```bash
npm test
# or
node tests/run.js
```

## Project structure

```
agentguard/
├── index.html          Page markup
├── css/
│   └── styles.css      Styling
├── js/
│   ├── engine.js       Policy and risk engine (pure logic, no DOM)
│   ├── audit.js        SHA-256 hash-chained audit log
│   └── app.js          UI wiring
├── tests/
│   └── run.js          Unit tests for engine and audit chain
├── docs/
│   └── ARCHITECTURE.md Design notes and roadmap
├── package.json
├── LICENSE
└── README.md
```

## Tech stack

HTML, CSS and vanilla JavaScript. The audit log uses the browser's built-in WebCrypto API (SHA-256). Tests use Node's built-in `assert`.

## What is real and what is simulated

This repository is a **working demo of the decision logic**. The policy engine, risk scoring, human-review flow and hash-chained audit log all run for real in the browser. The agent ("FinanceBot"), the wallet balance and the test-network preview are **simulated**. Blockchain anchoring is part of the full product design and is **not implemented in this demo**.

## Roadmap

- Anchor the audit-log fingerprint on a blockchain
- Real agent identity (signed credentials) instead of a fixed demo agent
- Pluggable policies per agent and per tool
- Real test-network transaction simulation
- Integration SDK so any agent framework can route actions through AgentGuard

## Team

Team SAMANVAY, DecentraHACK.

## License

MIT. See [LICENSE](LICENSE).
