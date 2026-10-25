import { useCallback, useEffect, useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function App() {
  const [log, setLog] = useState([])
  const [user, setUser] = useState(null)
  const [exams, setExams] = useState([])
  const [board, setBoard] = useState([])
  const [exam, setExam] = useState(null)
  const [i, setI] = useState(0)
  const [ans, setAns] = useState({})
  const [res, setRes] = useState(null)
  const [name, setName] = useState('')
  const [err, setErr] = useState('')

  // Every call goes through here so the inspector can show it.
  const api = useCallback(async (path, opt = {}) => {
    const t = performance.now()
    const m = opt.method || 'GET'
    const entry = { m, path, pre: m !== 'GET' && m !== 'HEAD' && !!opt.body, at: new Date().toLocaleTimeString() }
    const push = () => setLog(l => [{ ...entry, ms: Math.round(performance.now() - t) }, ...l].slice(0, 10))
    try {
      const r = await fetch(API + path, { credentials: 'include', headers: opt.body ? { 'Content-Type': 'application/json' } : {}, ...opt })
      entry.status = r.status; entry.origin = r.headers.get('X-Echo-Origin'); push()
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Request failed')
      setErr(''); return j
    } catch (e) {
      if (!entry.status) { entry.status = 'BLOCKED'; push(); setErr('Request blocked or server offline. Check the CORS settings on the server.') }
      else setErr(e.message)
      throw e
    }
  }, [])

  const refresh = () => api('/api/results').then(setBoard).catch(() => {})
  useEffect(() => {
    api('/api/me').then(j => setUser(j.name)).catch(() => {})
    api('/api/exams').then(setExams).catch(() => {})
    refresh()
  }, [])

  const login = e => { e.preventDefault(); api('/api/login', { method: 'POST', body: JSON.stringify({ name }) }).then(j => setUser(j.name)).catch(() => {}) }
  const open = id => api('/api/exams/' + id).then(x => { setExam(x); setI(0); setAns({}); setRes(null) }).catch(() => {})
  const submit = () => api(`/api/exams/${exam.id}/submit`, { method: 'POST', body: JSON.stringify({ answers: ans }) }).then(r => { setRes(r); refresh() }).catch(() => {})
  const q = exam?.qs[i]

  return (
    <div className="min-h-screen grid lg:grid-cols-[270px_1fr_350px] bg-paper text-ink">
      {/* Left rail: exams and leaderboard */}
      <aside className="bg-ink text-paper p-6 flex flex-col gap-8">
        <div className="font-display text-3xl font-extrabold">Examly<span className="text-teal">.</span></div>
        <div>
          <div className="text-xs text-paper/60 mb-3">{user ? `Signed in as ${user}` : 'Not signed in'}</div>
          <div className="space-y-2">
            {exams.map(x => (
              <button key={x.id} disabled={!user} onClick={() => open(x.id)}
                className={'w-full text-left rounded-xl px-4 py-3 transition disabled:opacity-40 ' + (exam?.id === x.id ? 'bg-teal text-ink' : 'bg-white/5 hover:bg-white/10')}>
                <div className="font-display font-bold">{x.title}</div>
                <div className="text-xs opacity-70">{x.count} questions</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold mb-3">Recent scores</div>
          {board.length === 0 && <div className="text-xs text-paper/50">No results yet.</div>}
          {board.map((b, k) => <div key={k} className="flex justify-between text-sm py-1 border-b border-white/10"><span>{b.name} <span className="text-paper/50">· {b.exam}</span></span><span className="font-mono text-teal">{b.pct}%</span></div>)}
        </div>
      </aside>

      {/* Center: the paper */}
      <main className="p-6 sm:p-12 flex flex-col justify-center">
        {err && <div className="mb-6 rounded-xl bg-coral/15 border border-coral text-coral px-4 py-3 text-sm">{err}</div>}
        {!user ? (
          <form onSubmit={login} className="max-w-md">
            <h1 className="font-display text-5xl font-extrabold leading-tight">Sit your exam. Cross an origin.</h1>
            <p className="mt-4 text-ink/70">This page and its API live on different origins. Sign in and watch CORS work in the inspector.</p>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="mt-8 w-full rounded-xl border-2 border-ink/20 bg-white px-4 py-3" />
            <button className="mt-4 rounded-xl bg-ink text-paper px-6 py-3 font-semibold">Sign in</button>
          </form>
        ) : res ? (
          <div className="max-w-2xl">
            <div className="font-display text-[8rem] leading-none font-extrabold" style={{ color: res.pct >= 60 ? '#10b3a0' : '#e8574f' }}>{res.pct}<span className="text-4xl">%</span></div>
            <p className="mt-2 text-lg">{res.score} of {res.total} correct. {res.pct >= 60 ? 'Passed.' : 'Not passed yet.'}</p>
            <div className="mt-8 space-y-3">
              {res.review.map((r, n) => (
                <div key={n} className="rounded-xl bg-white p-4 border-l-8" style={{ borderColor: r.your === r.correct ? '#10b3a0' : '#e8574f' }}>
                  <div className="font-semibold">{r.q}</div>
                  <div className="text-sm mt-1">You: {r.your == null ? 'Skipped' : r.o[r.your]}{r.your !== r.correct && <> · Correct: <b>{r.o[r.correct]}</b></>}</div>
                  <div className="text-sm text-ink/60 mt-1">{r.e}</div>
                </div>
              ))}
            </div>
            <button onClick={() => { setExam(null); setRes(null) }} className="mt-8 rounded-xl bg-ink text-paper px-6 py-3 font-semibold">Back to exams</button>
          </div>
        ) : q ? (
          <div className="max-w-2xl">
            <div className="font-display text-[10rem] leading-none font-extrabold text-ink/10 -mb-10 select-none">{String(i + 1).padStart(2, '0')}</div>
            <h1 className="relative font-display text-3xl sm:text-4xl font-extrabold leading-snug">{q.q}</h1>
            <div className="mt-8 grid sm:grid-cols-2 gap-3">
              {q.o.map((o, k) => (
                <button key={k} onClick={() => setAns(a => ({ ...a, [i]: k }))}
                  className={'text-left rounded-2xl border-2 px-5 py-4 transition ' + (ans[i] === k ? 'bg-ink text-paper border-ink' : 'bg-white border-ink/15 hover:border-ink')}>
                  <span className="font-mono text-xs opacity-60 mr-2">{'ABCD'[k]}</span>{o}
                </button>
              ))}
            </div>
            <div className="mt-8 flex items-center gap-3">
              <button disabled={i === 0} onClick={() => setI(i - 1)} className="rounded-xl border-2 border-ink/20 px-5 py-2.5 font-semibold disabled:opacity-30">Back</button>
              {i < exam.qs.length - 1
                ? <button onClick={() => setI(i + 1)} className="rounded-xl bg-ink text-paper px-6 py-2.5 font-semibold">Next</button>
                : <button onClick={submit} className="rounded-xl bg-teal text-ink px-6 py-2.5 font-semibold">Submit exam</button>}
              <div className="ml-auto flex gap-1.5">{exam.qs.map((_, n) => <button key={n} aria-label={'Question ' + (n + 1)} onClick={() => setI(n)} className={'h-2.5 w-7 rounded-full ' + (n === i ? 'bg-ink' : ans[n] !== undefined ? 'bg-teal' : 'bg-ink/15')} />)}</div>
            </div>
          </div>
        ) : (
          <div className="max-w-md"><h1 className="font-display text-5xl font-extrabold">Pick an exam from the left.</h1></div>
        )}
      </main>

      {/* Right: network inspector */}
      <aside className="bg-[#08141f] text-paper/90 p-6 font-mono text-xs">
        <div className="font-display text-lg font-bold text-teal">Network inspector</div>
        <div className="mt-1 text-paper/50">Page {location.origin}<br />API {API}</div>
        <div className="mt-6 space-y-3">
          {log.length === 0 && <div className="text-paper/40">Waiting for requests…</div>}
          {log.map((l, k) => {
            const bad = l.status === 'BLOCKED' || l.status >= 400
            return (
              <div key={k} className="rounded-lg border p-3" style={{ borderColor: bad ? '#e8574f' : 'rgba(255,255,255,.12)' }}>
                <div className="flex justify-between"><span><b>{l.m}</b> {l.path}</span><span className={bad ? 'text-coral' : 'text-teal'}>{l.status}</span></div>
                <div className="mt-1 text-paper/50">{l.at} · {l.ms}ms</div>
                <div className="mt-1">{l.pre ? <span className="text-amber">preflight OPTIONS sent first</span> : <span className="text-paper/50">simple request, no preflight</span>}</div>
                {l.origin && <div className="text-paper/50">server saw origin: {l.origin}</div>}
              </div>
            )
          })}
        </div>
      </aside>
    </div>
  )
}
