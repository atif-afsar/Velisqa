import express from 'express'
import cors from 'cors'
import process from 'process'

const app = express()
const PORT = process.env.PORT || 5000

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  })
)
app.use(express.json())

app.get('/', (_req, res) => {
  res.send('Velisqa backend is running')
})

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
