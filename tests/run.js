// Run with: node tests/run.js   (Node 18+, no dependencies)
const assert = require("assert");
const { evaluate } = require("../js/engine.js");
const Audit = require("../js/audit.js");

const policy = {
  limit: 1000,
  recipients: [
    { a: "professor@pccoe.edu", ok: 1 },
    { a: "stranger@unknown.net", ok: 0 },
  ],
};
const d = (action, p = policy) => evaluate(action, p).decision;
let passed = 0;
const t = async (name, fn) => { await fn(); passed++; console.log("  ok  " + name); };

(async () => {
  console.log("Engine");
  await t("read is allowed", () => assert.equal(d({ k: "read" }), "ALLOW"));
  await t("report is allowed", () => assert.equal(d({ k: "report" }), "ALLOW"));
  await t("$200 to trusted payee is allowed", () => assert.equal(d({ k: "pay", amt: 200, tr: 1 }), "ALLOW"));
  await t("$800 to new wallet needs human review", () => assert.equal(d({ k: "pay", amt: 800, tr: 0 }), "HUMAN REVIEW"));
  await t("$9,000 to unknown wallet is denied", () => assert.equal(d({ k: "pay", amt: 9000, tr: 0 }), "DENY"));
  await t("prompt injection is denied", () => {
    const r = evaluate({ k: "pay", amt: 5000, tr: 0, inj: 1 }, policy);
    assert.equal(r.decision, "DENY");
    assert.equal(r.risk, 100);
  });
  await t("delete is denied (no permission)", () => assert.equal(d({ k: "delete" }), "DENY"));
  await t("email to allowed address is allowed", () => assert.equal(d({ k: "email", to: "professor@pccoe.edu" }), "ALLOW"));
  await t("email to unticked address is denied", () => assert.equal(d({ k: "email", to: "stranger@unknown.net" }), "DENY"));
  await t("raising the limit changes the verdict", () => {
    const a = { k: "pay", amt: 2000, tr: 1 };
    assert.equal(d(a, { ...policy, limit: 1000 }), "HUMAN REVIEW");
    assert.equal(d(a, { ...policy, limit: 5000 }), "ALLOW");
  });

  console.log("Audit chain");
  await t("untouched chain verifies", async () => {
    const log = [];
    for (const x of ["a", "b", "c"]) await Audit.append(log, { action: x, decision: "ALLOW", rule: "r" });
    assert.equal(await Audit.verify(log), -1);
  });
  await t("tampering is detected at the edited entry", async () => {
    const log = [];
    for (const x of ["a", "b", "c"]) await Audit.append(log, { action: x, decision: "DENY", rule: "r" });
    log[1].decision = "ALLOW";
    assert.equal(await Audit.verify(log), 1);
  });

  console.log(`\n${passed} tests passed`);
})().catch((e) => { console.error("\nFAILED:", e.message); process.exit(1); });
