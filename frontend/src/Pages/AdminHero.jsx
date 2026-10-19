import { useEffect, useState } from 'react'
import AdminShell from '../Components/Admin/AdminShell'
import { api } from '../lib/apiClient'
import { uploadImageToCloudinary } from '../lib/cloudinaryUpload'

const LINK_PRESETS = [
  ['/collections', 'All jewellery'],
  ['/collections/necklaces', 'Necklaces'],
  ['/collections/earrings', 'Earrings'],
  ['/collections/rings', 'Rings'],
  ['/collections/bracelets', 'Bracelets'],
  ['/collections/bangles', 'Bangles'],
  ['/collections?sort=newest', 'New arrivals'],
]

const MAX_SLIDES = 8
const INTERVAL_OPTIONS = [3, 4, 5, 6, 8, 10, 15, 20, 30]
const emptySlide = () => ({ desktopUrl: '', mobileUrl: '', focus: '50% 50%', to: '/collections', label: 'Shop now', alt: '' })

/** Click/tap on the image to choose which point stays visible when it is cropped. */
function FocusPicker({ src, focus, aspect, onChange, label }) {
  function pick(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = Math.round(((event.clientX - rect.left) / rect.width) * 100)
    const y = Math.round(((event.clientY - rect.top) / rect.height) * 100)
    onChange(`${Math.min(100, Math.max(0, x))}% ${Math.min(100, Math.max(0, y))}%`)
  }
  const [fx, fy] = focus.split(' ')
  return (
    <figure>
      <figcaption className="admin-eyebrow mb-2">{label}</figcaption>
      <button type="button" onClick={pick} className={`relative block w-full overflow-hidden bg-[var(--a-canvas)] ${aspect}`} aria-label={`Set focus point for ${label}`}>
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover" style={{ objectPosition: focus }} draggable={false} />
        ) : (
          <span className="grid h-full place-items-center text-xs text-[var(--a-muted)]">No image yet</span>
        )}
        {src && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
            style={{ left: fx, top: fy }}
          />
        )}
      </button>
    </figure>
  )
}

function UploadButton({ label, onUploaded, onError }) {
  const [busy, setBusy] = useState(false)
  async function onChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const uploaded = await uploadImageToCloudinary(file, { purpose: 'site' })
      onUploaded(uploaded.secure_url)
    } catch (error) {
      onError(error?.message || 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <label className={`admin-btn-ghost cursor-pointer ${busy ? 'pointer-events-none opacity-50' : ''}`}>
      {busy ? 'Uploading…' : label}
      <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={onChange} disabled={busy} />
    </label>
  )
}

export default function AdminHero() {
  const [slides, setSlides] = useState([])
  const [intervalSeconds, setIntervalSeconds] = useState(5)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .get('/settings/hero')
      .then((data) => {
        if (cancelled) return
        setSlides(data.slides || [])
        setIntervalSeconds(Number(data.intervalSeconds) || 5)
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const update = (index, patch) => setSlides((list) => list.map((slide, i) => (i === index ? { ...slide, ...patch } : slide)))
  const move = (index, direction) =>
    setSlides((list) => {
      const next = [...list]
      const target = index + direction
      if (target < 0 || target >= next.length) return list
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

  async function save() {
    setError('')
    setNotice('')
    if (slides.some((slide) => !slide.desktopUrl)) {
      setError('Every banner needs an image (or remove the empty banner).')
      return
    }
    setSaving(true)
    try {
      await api.put('/admin/settings/hero', {
        intervalSeconds,
        slides: slides.map((slide) => ({ ...slide, mobileUrl: slide.mobileUrl || null, alt: slide.alt || slide.label || 'Velisqa jewellery' })),
      })
      setNotice(slides.length ? 'Banners published. The homepage shows them right away.' : 'Custom banners removed — the homepage uses the built-in banners again.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminShell
      title="Homepage banners"
      subtitle="Upload any size of image — it is cropped automatically to fit the banner (3:1 on desktop, 4:5 on phones). Click a preview to choose the point that must stay in view."
      actions={
        <button type="button" onClick={() => void save()} disabled={saving || loading} className="admin-btn">
          {saving ? 'Publishing…' : 'Publish banners'}
        </button>
      }
    >
      {error && <p className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {notice && <p className="mb-6 border border-[var(--a-accent-line)] bg-[var(--a-accent-tint)] px-4 py-3 text-sm text-[var(--a-accent-dark)]">{notice}</p>}

      {loading ? (
        <p className="text-sm text-[var(--a-muted)]">Loading banners…</p>
      ) : (
        <div className="space-y-8">
          <section className="admin-card flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-serif text-lg">Slideshow</p>
              <p className="mt-1 text-sm text-[var(--a-text-2)]">
                {slides.length > 1
                  ? `${slides.length} banners rotate automatically, in the order below.`
                  : 'Add two or more banners and they rotate automatically.'}{' '}
                Rotation pauses while a shopper hovers or swipes.
              </p>
            </div>
            <label className="block w-full sm:w-56">
              <span className="admin-label">Change banner every</span>
              <select className="admin-input" value={intervalSeconds} onChange={(e) => setIntervalSeconds(Number(e.target.value))}>
                {(INTERVAL_OPTIONS.includes(intervalSeconds) ? INTERVAL_OPTIONS : [...INTERVAL_OPTIONS, intervalSeconds].sort((a, b) => a - b)).map((n) => (
                  <option key={n} value={n}>{n} seconds</option>
                ))}
              </select>
            </label>
          </section>

          {slides.length === 0 && (
            <div className="admin-card text-sm text-[var(--a-text-2)]">
              No custom banners yet — the homepage is showing the built-in campaign banners. Add a banner to replace them.
            </div>
          )}

          {slides.map((slide, index) => (
            <section key={index} className="admin-card">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <p className="font-serif text-xl">Banner {index + 1}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="admin-btn-ghost" onClick={() => move(index, -1)} disabled={index === 0}>↑ Up</button>
                  <button type="button" className="admin-btn-ghost" onClick={() => move(index, 1)} disabled={index === slides.length - 1}>↓ Down</button>
                  <button type="button" className="admin-btn-ghost text-red-700" onClick={() => setSlides((list) => list.filter((_, i) => i !== index))}>Remove</button>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
                <div className="space-y-3">
                  <FocusPicker label="Desktop (3:1)" aspect="aspect-[3/1]" src={slide.desktopUrl} focus={slide.focus} onChange={(focus) => update(index, { focus })} />
                  <UploadButton label={slide.desktopUrl ? 'Replace desktop image' : 'Upload desktop image'} onUploaded={(url) => update(index, { desktopUrl: url })} onError={setError} />
                </div>
                <div className="space-y-3">
                  <FocusPicker label="Phone (4:5)" aspect="aspect-[4/5]" src={slide.mobileUrl || slide.desktopUrl} focus={slide.focus} onChange={(focus) => update(index, { focus })} />
                  <div className="flex flex-wrap gap-2">
                    <UploadButton label={slide.mobileUrl ? 'Replace phone image' : 'Optional phone image'} onUploaded={(url) => update(index, { mobileUrl: url })} onError={setError} />
                    {slide.mobileUrl && (
                      <button type="button" className="admin-btn-ghost" onClick={() => update(index, { mobileUrl: '' })}>Use desktop</button>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="admin-label">Opens</span>
                  <select className="admin-input" value={LINK_PRESETS.some(([to]) => to === slide.to) ? slide.to : '__custom'} onChange={(e) => e.target.value !== '__custom' && update(index, { to: e.target.value })}>
                    {LINK_PRESETS.map(([to, name]) => <option key={to} value={to}>{name}</option>)}
                    <option value="__custom">Custom path…</option>
                  </select>
                  {!LINK_PRESETS.some(([to]) => to === slide.to) && (
                    <input className="admin-input mt-2" value={slide.to} onChange={(e) => update(index, { to: e.target.value })} placeholder="/collections/earrings" />
                  )}
                </label>
                <label className="block">
                  <span className="admin-label">Button / link text</span>
                  <input className="admin-input" value={slide.label} maxLength={80} onChange={(e) => update(index, { label: e.target.value })} />
                </label>
                <label className="block">
                  <span className="admin-label">Image description (SEO)</span>
                  <input className="admin-input" value={slide.alt} maxLength={200} onChange={(e) => update(index, { alt: e.target.value })} placeholder="Model wearing gold hoop earrings" />
                </label>
              </div>
            </section>
          ))}

          {slides.length < MAX_SLIDES && (
            <button type="button" className="admin-btn-ghost" onClick={() => setSlides((list) => [...list, emptySlide()])}>
              + Add banner
            </button>
          )}
        </div>
      )}
    </AdminShell>
  )
}
