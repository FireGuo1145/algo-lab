import { spawn } from "node:child_process"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
const profile = mkdtempSync(join(tmpdir(), "chk-"))
const proc = spawn("/opt/google/chrome/chrome", ["--headless=new","--no-sandbox","--disable-gpu","--window-size=1280,900","--remote-debugging-port=9360",`--user-data-dir=${profile}`,"about:blank"], { stdio: "ignore" })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let version
for (let i = 0; i < 60; i++) { try { version = await (await fetch("http://127.0.0.1:9360/json/version")).json(); break } catch { await sleep(250) } }
const ws = new WebSocket(version.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener("open", r, { once: true }))
let id = 0; const pending = new Map(); const errors = []
ws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text) })
const send = (method, params = {}, sessionId) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params, sessionId })) })
const { result: { targetId } } = await send("Target.createTarget", { url: "about:blank" })
const { result: { sessionId } } = await send("Target.attachToTarget", { targetId, flatten: true })
await send("Runtime.enable", {}, sessionId); await send("Page.enable", {}, sessionId)
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }, sessionId)).result?.result?.value
for (const p of ["/", "/algo/heavy-light-decomposition"]) {
  await send("Page.navigate", { url: "http://127.0.0.1:5199" + p }, sessionId); await sleep(1400)
  console.log(p, JSON.stringify(await evaluate(`(() => {
    const a = [...document.querySelectorAll('header a')].find(x => x.href.includes('github.com'));
    if (!a) return 'missing';
    const r = a.getBoundingClientRect();
    return { href: a.href, target: a.target, rel: a.rel, text: a.innerText.replace(/\\n/g,' '), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), inViewport: r.right <= innerWidth }
  })()`)))
}
console.log("ERRORS:", errors.length ? errors : "none")
ws.close(); proc.kill()
