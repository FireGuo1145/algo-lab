/// <reference types="node" />
import assert from "node:assert/strict"
import { test } from "node:test"
import { PRESETS, simulate } from "./engine.ts"

function verify(a: number[], queries: {l:number;r:number}[]) {
  const result = simulate(a, queries)
  assert.deepEqual(result.answers, queries.map(q => new Set(a.slice(q.l, q.r+1)).size))
  for (const step of result.steps) {
    const window = a.slice(step.l, step.r+1)
    assert.equal(step.distinct, new Set(window).size)
    for (const [v,c] of step.counts) assert.equal(c, window.filter(x => x === v).length)
  }
}
test("presets, empty queries, singleton and negative values", () => {
  for (const p of PRESETS) verify(p.a,p.queries)
  verify([1],[])
  verify([-2], [{l:0,r:0}])
  verify([-2,0,-2,7], [{l:3,r:3},{l:0,r:3},{l:0,r:0}])
})
test("500 deterministic random arrays and every intermediate snapshot", () => {
  let seed = 1234
  const rand = (n: number) => { seed = (Math.imul(seed,1664525)+1013904223) >>> 0; return seed % n }
  for (let t=0;t<500;t++) {
    const n = 1+rand(20)
    const a = Array.from({length:n},()=>rand(9)-4)
    const qs = Array.from({length:20},()=>{const l=rand(n);return {l,r:l+rand(n-l)}})
    verify(a,qs)
  }
})
test("reject invalid inputs", () => {
  assert.throws(()=>simulate([],[]))
  assert.throws(()=>simulate([1],[{l:0,r:1}]))
  assert.throws(()=>simulate([1],[{l:-1,r:0}]))
})
