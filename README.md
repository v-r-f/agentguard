# AgentGuard

> AI agents may propose actions. AgentGuard decides whether they receive authority to act.

DecentraHACK · Team SAMANVAY

## What it does
A live demo of a guard layer that sits between an AI agent and its tools:

1. **Owner's rules**: spending limit, allowed email recipients
2. **Agent proposes** an action (payment, email, delete, prompt injection)
3. **Five checks**: identity, permissions, policy, risk, simulation
4. **Verdict**: ALLOW / HUMAN REVIEW / DENY
5. **Audit record**: SHA-256 hash-chained log; tampering is detectable

## Run it
No build step. Open `index.html` in a browser.
