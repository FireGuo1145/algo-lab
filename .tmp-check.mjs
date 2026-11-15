import { spawn } from "node:child_process"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
const profile = mkdtempSync(join(tmpdir(), "chk-"))
const proc = spawn("/opt/google/chrome/chrome", ["--headless=new","--no-sandbox","--disable-gpu","--remote-debugging-port=9351",`--user-data-dir=${profile}`,"about:blank"], { stdio: "ignore" })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let version
for (let i = 0; i < 60; i++) { try { version = await (await fetch("http://127.0.0.1:9351/json/version")).json(); break } catch { await sleep(250) } }
const ws = new WebSocket(version.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener("open", r, { once: true }))
let id = 0; const pending = new Map(); const errors = []
ws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text); if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map(a=>a.value??a.description).join(" ")) })
const send = (method, params = {}, sessionId) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params, sessionId })) })
const { result: { targetId } } = await send("Target.createTarget", { url: "about:blank" })
const { result: { sessionId } } = await send("Target.attachToTarget", { targetId, flatten: true })
await send("Runtime.enable", {}, sessionId); await send("Page.enable", {}, sessionId)
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }, sessionId)).result?.result?.value
await send("Page.navigate", { url: "http://127.0.0.1:5199/algo/heavy-light-decomposition" }, sessionId); await sleep(1500)
const r = await evaluate(`(async () => {
  const wait = (ms=250) => new Promise(r=>setTimeout(r,ms))
  const btns = () => [...document.querySelectorAll('button')]
  const byText = (t) => btns().find(b => b.textContent.trim() === t)
  const byLabel = (l) => btns().find(b => b.getAttribute('aria-label') === l)
  const out = {}
  // 1) 添加查询
  const inputs = [...document.querySelectorAll('input[type=number]')]
  const setVal = (el, v) => { const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; s.call(el, String(v)); el.dispatchEvent(new Event('input',{bubbles:true})) }
  setVal(inputs[0], 8); setVal(inputs[1], 3); await wait()
  byText('添加查询')?.click(); await wait(400)
  out.afterAdd = (document.body.innerText.match(/\\(\\d+, \\d+\\) = \\d+/g) || []).length
  // 2) 切到随机点值 + 重随机
  byText('随机')?.click(); await wait(300)
  out.randomLabel = (document.body.innerText.match(/路径 .*的点权和|点值/) ? 'ok' : '')
  const shake = byLabel('重新随机点值'); shake?.click(); await wait(300)
  out.shake = !!shake
  // 3) 跳到结尾，看查询结果是否都等于暴力（无 ≠ 标记）
  byLabel('跳到结尾')?.click(); await wait(300)
  out.mismatch = document.body.innerText.includes('≠')
  out.steps = document.body.innerText.match(/第 (\\d+) \\/ (\\d+) 步/)?.[0]
  // 4) 切预设「链」
  byText('链')?.click(); await wait(400)
  out.chain = document.body.innerText.match(/n = (\\d+)/)?.[1]
  out.chainQueries = (document.body.innerText.match(/\\(\\d+, \\d+\\) = \\d+/g) || []).join(' | ')
  // 5) 随机树
  byText('随机树')?.click(); await wait(400)
  out.randomTree = document.body.innerText.match(/n = (\\d+)/)?.[1]
  byLabel('跳到结尾')?.click(); await wait(300)
  out.mismatch2 = document.body.innerText.includes('≠')
  return out
})()`)
console.log(JSON.stringify(r, null, 1))
console.log("ERRORS:", errors.length ? errors : "none")
ws.close(); proc.kill()
