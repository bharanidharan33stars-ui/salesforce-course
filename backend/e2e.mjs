/**
 * Full end-to-end verification THROUGH the Next.js proxy (localhost:3000/api).
 *
 * Run with BOTH servers up (root `npm run dev`):
 *     node e2e.mjs
 *
 * Flow: register -> login -> enroll -> (certificate blocked) -> 30 lessons ->
 * (certificate still blocked) -> 5 quizzes (deliberate fail on #1, then pass)
 * -> exactly one certificate (UNIQUE) -> PDF download -> .eml file ->
 * public verification -> admin API allowed, learner denied from admin.
 *
 * Admin credentials are read from backend/.env (ADMIN_SETUP_*) - never hardcoded.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// E2E_BASE_URL lets the same script verify a DEPLOYED site, e.g.
//   E2E_BASE_URL=https://<project>.vercel.app/api node e2e.mjs
const BASE = process.env.E2E_BASE_URL || "http://localhost:3000/api";
const IS_LOCAL = /localhost|127\.0\.0\.1/.test(BASE);

function readEnvFile(file) {
  const out = {};
  try {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      if (line.trim().startsWith("#")) continue;
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* missing file -> empty */
  }
  return out;
}

const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = readEnvFile(path.join(here, ".env"));
const ADMIN_EMAIL = process.env.ADMIN_SETUP_EMAIL || envFile.ADMIN_SETUP_EMAIL;
const ADMIN_PASS = process.env.ADMIN_SETUP_PASSWORD || envFile.ADMIN_SETUP_PASSWORD;
if (!ADMIN_EMAIL || !ADMIN_PASS) {
  console.error("ADMIN_SETUP_EMAIL / ADMIN_SETUP_PASSWORD missing from backend/.env");
  process.exit(1);
}

const start = Date.now();
const stamp = Date.now();
const learnerEmail = `e2e.learner+${stamp}@academy.test`;
const learnerPass = "Learn1234";

const results = [];
function must(name, cond, extra = "") {
  results.push({ name, pass: !!cond, extra });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? `  :: ${extra}` : ""}`);
  if (!cond) throw new Error(`FAILED: ${name} ${extra}`);
}

function cookieHeader(jar) {
  return Object.entries(jar.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
}

async function req(method, path_, body, jar) {
  const headers = {};
  const cookie = cookieHeader(jar);
  if (cookie) headers.cookie = cookie;
  if (jar.cookies.sla_csrf) headers["x-csrf-token"] = jar.cookies.sla_csrf;
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(BASE + path_, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  for (const sc of res.headers.getSetCookie()) {
    const pair = sc.split(";")[0];
    const i = pair.indexOf("=");
    const name = pair.slice(0, i).trim();
    const value = pair.slice(i + 1).trim();
    if (value === "") delete jar.cookies[name];
    else jar.cookies[name] = value;
  }
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-json */ }
  const data = json && typeof json === "object" && "data" in json ? json.data : json;
  return { status: res.status, ok: res.ok, json, text, data };
}

function listOf(x, key) {
  if (Array.isArray(x)) return x;
  if (x && Array.isArray(x[key])) return x[key];
  return null;
}

const learner = { cookies: {} };
const admin = { cookies: {} };
const nobody = { cookies: {} };

try {
  // 0. proxy health
  const h = await req("GET", "/health", undefined, nobody);
  must("proxy health via :3000", h.status === 200 && h.data?.status === "ok", `status=${h.status}`);

  // 1. register + login
  const reg = await req("POST", "/auth/register", {
    fullName: "Test Learner",
    email: learnerEmail,
    password: learnerPass,
    confirmPassword: learnerPass,
    acceptTerms: true,
  }, learner);
  must("register learner", reg.status >= 200 && reg.status < 300, `status=${reg.status} ${reg.status >= 300 ? reg.text.slice(0, 240) : ""}`);

  const li = await req("POST", "/auth/login", { email: learnerEmail, password: learnerPass, remember: false }, learner);
  must("learner login", li.status === 200, `status=${li.status}`);

  const me = await req("GET", "/auth/me", undefined, learner);
  const meUser = me.data?.user ?? me.data;
  must("session restored (/auth/me)", me.status === 200 && meUser?.email === learnerEmail, `status=${me.status}`);

  // 2. courses + enroll
  const cs = await req("GET", "/courses", undefined, learner);
  const courses = listOf(cs.data, "courses");
  must("courses list", !!courses && courses.length >= 1, `status=${cs.status}`);
  const course = courses[0];
  const courseId = Number(course.id);
  const courseSlug = course.slug;
  must("course has id+slug", Number.isFinite(courseId) && !!courseSlug, JSON.stringify(course).slice(0, 160));

  const en = await req("POST", `/courses/${courseId}/enroll`, {}, learner);
  must("enroll", en.status >= 200 && en.status < 300, `status=${en.status} ${en.text.slice(0, 160)}`);
  const en2 = await req("POST", `/courses/${courseId}/enroll`, {}, learner);
  must("enroll idempotent", en2.status >= 200 && en2.status < 300, `status=${en2.status}`);

  // 3. negative gate A: nothing studied yet
  const gA = await req("POST", "/student/certificates/request", {}, learner);
  must("certificate BLOCKED before studying", gA.status >= 400, `status=${gA.status}`);

  // 4. units -> lessons + quiz ids
  const us = await req("GET", `/courses/${courseSlug}/units`, undefined, learner);
  const units = listOf(us.data, "units");
  must("5 units", !!units && units.length === 5, `got ${units ? units.length : "none"} status=${us.status}`);

  const lessons = [];
  const quizIds = [];
  for (const u of units) {
    const ud = await req("GET", `/units/${u.slug}`, undefined, learner);
    must(`unit ${u.slug} loads`, ud.status === 200, `status=${ud.status}`);
    const ls = listOf(ud.data?.lessons ?? ud.data, "lessons");
    must(`unit ${u.slug} has lessons`, !!ls && ls.length > 0, `n=${ls ? ls.length : 0}`);
    if (ls) for (const l of ls) lessons.push(l);
    if (ud.data?.quiz?.id) quizIds.push(Number(ud.data.quiz.id));
  }
  must("30 lessons total", lessons.length === 30, `got ${lessons.length}`);
  must("5 quizzes total", quizIds.length === 5, `got ${quizIds.length}`);

  // 5. complete all 30 lessons (start + complete)
  let completed = 0;
  for (const l of lessons) {
    const st = await req("POST", `/student/lessons/${Number(l.id)}/start`, {}, learner);
    must(`start lesson ${l.id}`, st.status < 400, `status=${st.status}`);
    const cp = await req("POST", `/student/lessons/${Number(l.id)}/complete`, {}, learner);
    must(`complete lesson ${l.id}`, cp.status < 400, `status=${cp.status}`);
    completed += 1;
  }
  console.log(`      lessons completed: ${completed}/30`);

  // 6. negative gate B: lessons done, quizzes NOT passed
  const cl0 = await req("GET", "/student/certificates", undefined, learner);
  const list0 = listOf(cl0.data, "certificates") ?? [];
  must("no certificate after lessons only", list0.length === 0, `n=${list0.length}`);
  const gB = await req("POST", "/student/certificates/request", {}, learner);
  must("certificate BLOCKED until quizzes pass", gB.status >= 400, `status=${gB.status}`);

  // 7. admin session, admin API positive + learner denied
  const ali = await req("POST", "/auth/login", { email: ADMIN_EMAIL, password: ADMIN_PASS, remember: false }, admin);
  must("admin login", ali.status === 200, `status=${ali.status}`);
  const ame = await req("GET", "/auth/me", undefined, admin);
  const au = ame.data?.user ?? ame.data;
  must("admin role", au?.role === "admin", `role=${au?.role}`);
  const ad = await req("GET", "/admin/dashboard", undefined, admin);
  must("admin dashboard API", ad.status === 200, `status=${ad.status}`);
  const denied = await req("GET", "/admin/dashboard", undefined, learner);
  must("learner DENIED from admin API", denied.status >= 400, `status=${denied.status}`);

  // 8. answer keys via admin quiz API (server-side only; student API never exposes them)
  const keys = {};
  for (const qid of quizIds) {
    const qd = await req("GET", `/admin/quizzes/${qid}`, undefined, admin);
    must(`admin quiz detail ${qid}`, qd.status === 200, `status=${qd.status}`);
    const d = qd.data;
    const qs = Array.isArray(d?.questions) ? d.questions
      : Array.isArray(d?.quiz?.questions) ? d.quiz.questions
      : Array.isArray(d) ? d : [];
    must(`quiz ${qid} has questions`, qs.length > 0, `n=${qs.length}`);
    keys[qid] = qs.map((q) => ({
      questionId: Number(q.id),
      correct: (q.options ?? []).filter((o) => o.isCorrect).map((o) => Number(o.id)),
      wrong: (q.options ?? []).filter((o) => !o.isCorrect).map((o) => Number(o.id)),
    }));
    must(`quiz ${qid} answer key complete`, keys[qid].every((x) => x.correct.length > 0), "");
  }

  // 9. quiz 1: submit all-WRONG first -> must NOT pass
  const q1 = quizIds[0];
  must("quiz 1 has wrong options to pick", keys[q1].every((x) => x.wrong.length > 0), "");
  const wrongAnswers = keys[q1].map((x) => ({ questionId: x.questionId, optionIds: [x.wrong[0]] }));
  const fail = await req("POST", `/student/quizzes/${q1}/submit`, { answers: wrongAnswers }, learner);
  must("quiz 1 wrong attempt accepted", fail.status === 200, `status=${fail.status} ${fail.status !== 200 ? fail.text.slice(0, 200) : ""}`);
  const failPassed = fail.data?.passed ?? fail.data?.result?.passed;
  must("quiz 1 wrong attempt NOT passed", failPassed !== true, `passed=${failPassed} body=${JSON.stringify(fail.data).slice(0, 200)}`);

  // 10. pass all 5 quizzes with the correct key
  for (const qid of quizIds) {
    const answers = keys[qid].map((x) => ({ questionId: x.questionId, optionIds: x.correct }));
    const r = await req("POST", `/student/quizzes/${qid}/submit`, { answers }, learner);
    must(`quiz ${qid} submit ok`, r.status === 200, `status=${r.status} ${r.status !== 200 ? r.text.slice(0, 240) : ""}`);
    const passed = r.data?.passed ?? r.data?.result?.passed;
    must(`quiz ${qid} PASSED`, passed === true, `body=${JSON.stringify(r.data).slice(0, 220)}`);
  }

  // 11. exactly one certificate, auto-issued
  const cl = await req("GET", "/student/certificates", undefined, learner);
  const certs = listOf(cl.data, "certificates") ?? [];
  must("exactly ONE certificate issued", certs.length === 1, `n=${certs.length}`);
  const cert = certs[0];
  const certId = Number(cert.id);
  const certNo = cert.certificateNumber ?? cert.certificate_number;
  must("certificate number present", !!String(certNo), String(certNo));

  // 12. UNIQUE: requesting again reuses the same certificate
  const re = await req("POST", "/student/certificates/request", {}, learner);
  must("re-request returns success (reuse)", re.status >= 200 && re.status < 300, `status=${re.status} ${re.status >= 300 ? re.text.slice(0, 200) : ""}`);
  const cl2 = await req("GET", "/student/certificates", undefined, learner);
  const certs2 = listOf(cl2.data, "certificates") ?? [];
  must("certificate UNIQUE (still 1, same id)", certs2.length === 1 && Number(certs2[0].id) === certId, `n=${certs2.length}`);

  // 13. PDF download through the proxy
  const dl = await fetch(BASE + `/student/certificates/${certId}/download`, { headers: { cookie: cookieHeader(learner) } });
  const buf = Buffer.from(await dl.arrayBuffer());
  const head = buf.subarray(0, 5).toString("latin1");
  must("PDF download 200", dl.status === 200, `status=${dl.status}`);
  must("PDF magic bytes %PDF-", head === "%PDF-", `got ${JSON.stringify(head)} bytes=${buf.length}`);
  must("PDF has real content", buf.length > 2000, `${buf.length} bytes`);

  // 14. .eml written under storage/mail (file delivery mode) - local only:
  // on a deployment the capture directory lives in the server's /tmp.
  if (IS_LOCAL) {
    const mailDir = path.resolve("storage/mail");
    const all = fs.existsSync(mailDir)
      ? fs.readdirSync(mailDir).filter((f) => f.endsWith(".eml"))
          .map((f) => ({ f, m: fs.statSync(path.join(mailDir, f)).mtimeMs }))
      : [];
    const fresh = all.filter((x) => x.m >= start - 60_000).sort((a, b) => b.m - a.m);
    must("fresh .eml written", fresh.length >= 1, `total=${all.length} dir=${mailDir}`);
    const eml = fs.readFileSync(path.join(mailDir, fresh[0].f), "utf8");
    must(".eml addressed to learner", eml.includes(learnerEmail), fresh[0].f);
    must(".eml is a certificate e-mail", /certificate/i.test(eml), "");
  } else {
    console.log("SKIP  .eml file check (remote deployment - capture dir is server-side /tmp)");
  }

  // 15. public verification (no session at all) — keyed by the 32-hex verification id
  const verId = String(cert.verificationId ?? cert.verification_id ?? "");
  must("verification id present (32 hex)", /^[0-9a-f]{32}$/i.test(verId), verId);
  const vf = await req("GET", `/public/certificates/${verId}/verify`, undefined, nobody);
  must("public verify valid", vf.status === 200 && vf.data?.valid === true, `status=${vf.status} body=${JSON.stringify(vf.data).slice(0, 200)}`);
  must("public verify number matches", String(vf.data?.certificateNumber ?? "") === String(certNo), `${vf.data?.certificateNumber} vs ${certNo}`);
  const bogus = await req("GET", "/public/certificates/deadbeefdeadbeefdeadbeefdeadbeef/verify", undefined, nobody);
  must("bogus verification id -> 404", bogus.status === 404, `status=${bogus.status}`);
} catch (err) {
  console.error(`\nABORTED: ${err.message}`);
}

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
console.log(`\n===== E2E: ${passed} passed, ${failed} failed, ${results.length} total (${((Date.now() - start) / 1000).toFixed(1)}s) =====`);
process.exit(failed > 0 ? 1 : 0);
