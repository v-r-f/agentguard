/** AgentGuard demo UI: wires the DOM to the engine and audit modules. */
(function () {
  "use strict";
  const { ACTIONS, WALLET_BALANCE, REVIEW_AT, DENY_AT, evaluate, fmt } = AgentGuardEngine;
  const Audit = AgentGuardAudit;

  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CHECKS = ["Identity", "Permissions", "Policy", "Risk", "Simulation"];
  const COLORS = { ALLOW: "var(--gr)", DENY: "var(--rd)", REVIEW: "var(--am)" };

  const limit = $("lim");
  let recipients = [
    { a: "professor@pccoe.edu", ok: 1 },
    { a: "partner@vendor.com", ok: 1 },
    { a: "stranger@unknown.net", ok: 0 },
  ];
  let actions = [];
  let log = [];
  let busy = false;

  /* ---------- Section I: owner's rules ---------- */
  limit.oninput = () => ($("lv").textContent = fmt(+limit.value));

  function paintRules() {
    $("chips").innerHTML = recipients
      .map((r, i) => `<label class="chip ${r.ok ? "on" : ""}"><input type="checkbox" data-r="${i}" ${r.ok ? "checked" : ""}>${esc(r.a)}</label>`)
      .join("");
    actions = [
      ...ACTIONS.slice(0, 2),
      ...recipients.map((r) => ({ t: "Email " + r.a, k: "email", to: r.a, tag: "Email" })),
      ...ACTIONS.slice(2),
    ];
    $("acts").innerHTML = actions
      .map((a, i) => `<button data-i="${i}"><small>${a.tag}</small>${esc(a.t)}</button>`)
      .join("");
  }

  $("chips").onchange = (e) => {
    const i = e.target.dataset.r;
    if (i != null) { recipients[i].ok = e.target.checked ? 1 : 0; paintRules(); }
  };

  $("nb").onclick = () => {
    const v = $("ni").value.trim().toLowerCase(), msg = $("nm");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { msg.textContent = "Please enter a valid email address."; return; }
    if (recipients.some((r) => r.a === v)) { msg.textContent = "That address is already in the list."; return; }
    recipients.push({ a: v, ok: 0 });
    $("ni").value = "";
    msg.textContent = "Added. Tick it to allow email to that address.";
    paintRules();
  };

  /* ---------- Section II: choose an action ---------- */
  $("acts").onclick = (e) => {
    const b = e.target.closest("button");
    if (b && !busy) run(actions[b.dataset.i]);
  };

  /* ---------- Section III + IV: examine and decide ---------- */
  function drawSteps(rows) {
    $("steps").innerHTML = rows
      .map((r) => `<div class="row"><i class="dot ${r[1]}"></i><b>${r[0]}</b><span class="t">${r[2]}</span></div>`)
      .join("");
  }

  function showVerdict(decision, why) {
    const c = decision.startsWith("ALLOW") ? COLORS.ALLOW : decision.startsWith("DENY") ? COLORS.DENY : COLORS.REVIEW;
    const box = $("dec");
    box.className = "dec";
    box.style.borderColor = c;
    box.innerHTML = `<div class="dh" style="color:${c}">${decision}</div><p>${why}</p>`;
    return box;
  }

  async function run(a) {
    busy = true;
    const res = evaluate(a, { limit: +limit.value, recipients });
    const { perm, risk, pol } = res;

    const rows = CHECKS.map((n) => [n, "", "waiting..."]);
    drawSteps(rows);
    $("rm").style.width = "0";
    $("rs").textContent = "\u2013";
    $("dec").className = "cap";
    $("dec").style.borderColor = "";
    $("dec").innerHTML = "Examining...";

    const riskLevel = risk >= DENY_AT ? "bad" : risk >= REVIEW_AT ? "warn" : "ok";
    const out = [
      ["ok", "Agent 'FinanceBot' is verified"],
      perm ? ["ok", "This agent may use this tool"] : ["bad", "This agent has no permission for this tool"],
      perm ? pol : ["", "Skipped"],
      perm ? [riskLevel, a.inj ? "Hidden instruction found in the input. Score " + risk : "Score " + risk] : ["", "Skipped"],
      perm
        ? ["ok", a.k === "pay" ? `Test network preview: balance ${fmt(WALLET_BALANCE)} to ${fmt(WALLET_BALANCE - a.amt)}` : "No preview needed"]
        : ["", "Skipped"],
    ];

    for (let i = 0; i < CHECKS.length; i++) {
      await sleep(450);
      rows[i] = [CHECKS[i], out[i][0], out[i][1]];
      drawSteps(rows);
      if (i === 3 && perm) {
        $("rs").textContent = risk;
        $("rm").style.width = risk + "%";
        $("rm").style.background = risk >= DENY_AT ? COLORS.DENY : risk >= REVIEW_AT ? COLORS.REVIEW : COLORS.ALLOW;
      }
    }

    let decision = res.decision;
    const box = showVerdict(decision, res.why);

    if (decision === "HUMAN REVIEW") {
      box.insertAdjacentHTML(
        "beforeend",
        `<p>Summary for the reviewer: &ldquo;${esc(a.t)}&rdquo;, risk ${risk} out of 100.</p>
         <div class="bar"><button class="pri" id="ap">Approve</button><button id="rj">Reject</button></div>`
      );
      await new Promise((resolve) => {
        $("ap").onclick = () => { decision = "ALLOW (human approved)"; resolve(); };
        $("rj").onclick = () => { decision = "DENY (human rejected)"; resolve(); };
      });
      showVerdict(decision, "Decision recorded.");
    }

    await Audit.append(log, { action: a.t, decision, rule: res.why });
    drawLog();
    busy = false;
  }

  /* ---------- Section V: audit record ---------- */
  function drawLog(badFrom = -1) {
    $("log").innerHTML =
      log.map((e, i) =>
        `<div class="log ${badFrom >= 0 && i >= badFrom ? "broken" : ""}">${e.n}. ${e.time} &mdash; ${esc(e.action)} &rarr; <b>${e.decision}</b>` +
        `<small>hash ${e.hash.slice(0, 20)}... &middot; previous ${e.prev.slice(0, 20)}...</small></div>`
      ).join("") || '<div class="cap">No entries yet.</div>';
    $("fp").textContent = log.length ? log[log.length - 1].hash.slice(0, 32) + "..." : "\u2013";
  }

  function note(text, color) {
    const m = $("vm");
    m.style.color = color;
    m.textContent = text;
  }

  $("vb").onclick = async () => {
    if (!log.length) return note("Run an action first.", "var(--mu)");
    const bad = await Audit.verify(log);
    drawLog(bad);
    note(
      bad < 0 ? "Record is intact. Nothing was changed." : `Tampering found at entry ${bad + 1}. Every entry after it can no longer be trusted.`,
      bad < 0 ? "var(--gr)" : "var(--rd)"
    );
  };

  $("tb").onclick = () => {
    if (!log.length) return note("Run an action first.", "var(--mu)");
    log[0].decision = "ALLOW (edited)";
    log[0].action = "(changed by an attacker)";
    drawLog();
    note("Entry 1 was edited. Now press Verify record.", "var(--am)");
  };

  $("rb").onclick = () => { log = []; drawLog(); $("vm").textContent = ""; };

  paintRules();
  drawLog();
})();
