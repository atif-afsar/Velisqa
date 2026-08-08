import { useEffect, useState } from 'react'
import AdminShell from '../Components/Admin/AdminShell'
import { useConfirm } from '../hooks/useConfirm'
import { supabase } from '../lib/supabaseClient'
import { formatInr } from '../lib/promoPricing'

const emptyForm = {
  code: '',
  discount_type: 'percentage',
  discount_value: '',
  min_subtotal: '0',
  active: true,
}

export default function AdminCoupons() {
  const { confirm, ConfirmDialog } = useConfirm()
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function fetchCoupons() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCoupons(data || [])
    } catch (err) {
      setError(err.message || 'Failed to fetch coupons.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCoupons()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setNotice('')

    const code = String(form.code || '').toUpperCase().trim()
    if (!code) {
      setError('Coupon code is required.')
      return
    }

    const value = Number(form.discount_value)
    if (isNaN(value) || value <= 0) {
      setError('Discount value must be greater than zero.')
      return
    }

    if (form.discount_type === 'percentage' && value > 100) {
      setError('Percentage discount cannot exceed 100%.')
      return
    }

    setSubmitting(true)

    try {
      const { error } = await supabase.from('coupons').insert({
        code,
        discount_type: form.discount_type,
        discount_value: value,
        min_subtotal: Number(form.min_subtotal || 0),
        active: form.active,
      })

      if (error) throw error

      setNotice(`Coupon "${code}" created successfully!`)
      setForm(emptyForm)
      fetchCoupons()
    } catch (err) {
      setError(err.message || 'Failed to create coupon.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleActive(coupon) {
    setError('')
    setNotice('')
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ active: !coupon.active })
        .eq('code', coupon.code)

      if (error) throw error
      setNotice(`Coupon "${coupon.code}" active status updated.`)
      fetchCoupons()
    } catch (err) {
      setError(err.message || 'Failed to update status.')
    }
  }

  async function handleDelete(coupon) {
    const ok = await confirm({
      title: 'Delete Coupon',
      message: `Are you sure you want to permanently delete coupon "${coupon.code}"?`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    })

    if (!ok) return

    setError('')
    setNotice('')
    try {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('code', coupon.code)

      if (error) throw error
      setNotice(`Coupon "${coupon.code}" deleted.`)
      fetchCoupons()
    } catch (err) {
      setError(err.message || 'Failed to delete coupon.')
    }
  }

  const inputClass =
    'mt-1 block w-full rounded-xl border border-[#847377]/35 bg-white px-3 py-2 text-sm text-[#130006] outline-none focus:border-[#3d0a21] focus:ring-1 focus:ring-[#3d0a21]'

  return (
    <AdminShell
      title="Coupons Management"
      subtitle="Create unique coupon discount codes and manage minimum cart values."
      onRefresh={fetchCoupons}
    >
      {ConfirmDialog}

      <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
        {/* Left Column: List of coupons */}
        <div className="rounded-2xl border border-[#3d0a21]/10 bg-white p-5 shadow-sm">
          <h3 className="font-serif text-lg font-semibold text-[#3d0a21] mb-4">Existing Coupons</h3>
          
          {loading ? (
            <p className="text-sm text-[#847377] py-6 text-center animate-pulse">Loading coupons…</p>
          ) : coupons.length === 0 ? (
            <p className="text-sm text-[#847377] py-6 text-center">No coupons configured yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#514347]">
                <thead>
                  <tr className="border-b border-[#3d0a21]/10 text-[10px] font-bold uppercase tracking-wider text-[#847377]">
                    <th className="pb-3 pr-2">Code</th>
                    <th className="pb-3 pr-2">Type</th>
                    <th className="pb-3 pr-2">Discount</th>
                    <th className="pb-3 pr-2">Min Order</th>
                    <th className="pb-3 pr-2 text-center">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {coupons.map((coupon) => (
                    <tr key={coupon.code} className="hover:bg-gray-50/50">
                      <td className="py-3.5 pr-2 font-mono font-bold text-[#130006]">{coupon.code}</td>
                      <td className="py-3.5 pr-2 capitalize">{coupon.discount_type}</td>
                      <td className="py-3.5 pr-2 font-semibold">
                        {coupon.discount_type === 'percentage'
                          ? `${coupon.discount_value}%`
                          : formatInr(coupon.discount_value)}
                      </td>
                      <td className="py-3.5 pr-2">{formatInr(coupon.min_subtotal)}</td>
                      <td className="py-3.5 pr-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(coupon)}
                          className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider transition ${
                            coupon.active
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {coupon.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(coupon)}
                          className="font-bold text-red-700 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Add coupon form */}
        <div className="rounded-2xl border border-[#3d0a21]/10 bg-white p-5 shadow-sm self-start space-y-4">
          <h3 className="font-serif text-lg font-semibold text-[#3d0a21]">Create Coupon</h3>

          {error && <p className="text-xs font-semibold text-red-700 bg-red-50 p-2.5 rounded-lg border border-red-100">{error}</p>}
          {notice && <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">{notice}</p>}

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">
                Coupon Code
              </span>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. FESTIVE20"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                required
              />
            </label>

            <label className="block">
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">
                Discount Type
              </span>
              <select
                className={inputClass}
                value={form.discount_type}
                onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value }))}
                required
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </label>

            <label className="block">
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">
                Discount Value
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className={inputClass}
                placeholder="e.g. 10 or 150"
                value={form.discount_value}
                onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
                required
              />
            </label>

            <label className="block">
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#847377]">
                Min Order Subtotal (₹)
              </span>
              <input
                type="number"
                min="0"
                step="1"
                className={inputClass}
                placeholder="e.g. 999"
                value={form.min_subtotal}
                onChange={(e) => setForm((f) => ({ ...f, min_subtotal: e.target.value }))}
                required
              />
            </label>

            <label className="flex items-center gap-2.5 pt-2 cursor-pointer text-xs font-semibold text-[#514347]">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-[#3d0a21] focus:ring-[#3d0a21]"
              />
              <span>Enable this coupon immediately</span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="mt-4 w-full rounded-full bg-[#3d0a21] py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow hover:bg-[#2a0718] transition disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create Coupon'}
            </button>
          </form>
        </div>
      </div>
    </AdminShell>
  )
}
