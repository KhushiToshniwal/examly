import express from 'express'
import cors from 'cors'

const app = express()
const isProd = process.env.NODE_ENV === 'production'
app.set('trust proxy', 1) // hosts put a proxy in front, needed for secure cookies

// Trim spaces and trailing slashes so a typo in the env var doesn't break CORS
const allowed = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean)

app.use(cors({
  origin: (origin, cb) => (!origin || allowed.includes(origin)) ? cb(null, true) : cb(new Error('Origin not allowed')),
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  exposedHeaders: ['X-Echo-Origin'], // lets the browser JS read this header
  credentials: true,                 // allows the session cookie
  maxAge: 600                        // browser may cache the preflight for 10 min
}))
app.use(express.json())
app.use((req, res, next) => { res.setHeader('X-Echo-Origin', req.headers.origin || 'none'); next() })

const EXAMS = [
  { id: 'js', title: 'JavaScript Essentials', blurb: 'Scope, types, async.', qs: [
    { q: 'What does typeof null return?', o: ['"null"', '"object"', '"undefined"', '"number"'], a: 1, e: 'A historic quirk: null reports "object".' },
    { q: 'Which keyword declares a reassignable block-scoped variable?', o: ['var', 'const', 'let', 'static'], a: 2, e: 'let is block scoped and reassignable.' },
    { q: 'Result of [1,2,3].map(n => n * 2)?', o: ['[2,4,6]', '[1,2,3]', '6', 'undefined'], a: 0, e: 'map returns a new transformed array.' },
    { q: 'Which turns a JSON string into an object?', o: ['JSON.stringify', 'JSON.parse', 'JSON.object', 'Object.from'], a: 1, e: 'parse reads, stringify writes.' }
  ]},
  { id: 'web', title: 'Web and CORS', blurb: 'HTTP, origins, preflight.', qs: [
    { q: 'What does CORS control?', o: ['Page rendering', 'Which origins may read a response', 'Cookie encryption', 'Database access'], a: 1, e: 'The server declares which other origins can read its responses.' },
    { q: 'Which request triggers a preflight?', o: ['Simple GET', 'JSON POST with custom headers', 'Link click', 'Image load'], a: 1, e: 'Non-simple requests get an OPTIONS check first.' },
    { q: 'Can Allow-Origin be * when credentials are sent?', o: ['Yes', 'No', 'Only for GET', 'Only on HTTPS'], a: 1, e: 'With credentials the origin must be an exact match.' },
    { q: 'Which status means not found?', o: ['200', '301', '404', '500'], a: 2, e: '404 Not Found.' }
  ]},
  { id: 'apt', title: 'Quick Aptitude', blurb: 'Fast arithmetic.', qs: [
    { q: '15% of 240?', o: ['30', '36', '40', '42'], a: 1, e: '240 x 0.15 = 36.' },
    { q: 'Next: 2, 6, 12, 20, ?', o: ['28', '30', '32', '34'], a: 1, e: 'Differences 4,6,8,10 so 30.' },
    { q: '5 pens cost 60. Cost of 8?', o: ['84', '92', '96', '100'], a: 2, e: '12 each, 8 x 12 = 96.' },
    { q: 'Square root of 196?', o: ['12', '13', '14', '16'], a: 2, e: '14 x 14 = 196.' }
  ]}
]
const results = []
const userOf = req => /(?:^|; )name=([^;]+)/.exec(req.headers.cookie || '')?.[1]

app.get('/', (_, res) => res.json({ ok: true })) // health check for hosting platforms
app.get('/api/me', (req, res) => res.json({ name: userOf(req) ? decodeURIComponent(userOf(req)) : null }))
app.post('/api/login', (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 30)
  if (!name) return res.status(400).json({ error: 'Name is required' })
  // Cross-site cookies in production need SameSite=None and Secure (HTTPS)
  res.cookie('name', encodeURIComponent(name), {
    httpOnly: true,
    maxAge: 864e5,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd
  })
  res.json({ name })
})
app.get('/api/exams', (_, res) => res.json(EXAMS.map(({ id, title, blurb, qs }) => ({ id, title, blurb, count: qs.length }))))
app.get('/api/exams/:id', (req, res) => {
  const x = EXAMS.find(e => e.id === req.params.id)
  if (!x) return res.status(404).json({ error: 'Exam not found' })
  res.json({ id: x.id, title: x.title, qs: x.qs.map(({ q, o }) => ({ q, o })) })
})
app.post('/api/exams/:id/submit', (req, res) => {
  const x = EXAMS.find(e => e.id === req.params.id)
  if (!x) return res.status(404).json({ error: 'Exam not found' })
  const ans = req.body.answers || {}
  const review = x.qs.map((q, n) => ({ q: q.q, your: ans[n] ?? null, correct: q.a, o: q.o, e: q.e }))
  const score = review.filter(r => r.your === r.correct).length
  const pct = Math.round(score / x.qs.length * 100)
  results.unshift({ name: userOf(req) ? decodeURIComponent(userOf(req)) : 'Guest', exam: x.title, pct })
  res.json({ score, total: x.qs.length, pct, review })
})
app.get('/api/results', (_, res) => res.json(results.slice(0, 6)))
app.use((err, _req, res, _next) => res.status(403).json({ error: err.message }))

// Hosts assign the port through the PORT environment variable
app.listen(process.env.PORT || 4000, () => console.log('API running, allowing', allowed.join(', ')))