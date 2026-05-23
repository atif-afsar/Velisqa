import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { submitCreatorApplication } from "../../lib/creatorApplications";
import {
  CONTENT_NICHES,
  CREATOR_TIERS,
  PLATFORMS,
  formatFollowerCount,
  getTierFromFollowers,
} from "./creatorTierData";

const EASE = [0.16, 1, 0.3, 1];

const fieldClass =
  "w-full border border-[#130006]/20 bg-white/80 px-4 py-3 text-sm text-[#130006] outline-none transition focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/15 placeholder:text-[#847377]/45 rounded-lg";

const labelClass = "label-stitch text-[0.68rem] uppercase tracking-[0.14em] text-[#514347]";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  platform: "instagram",
  handle: "",
  followerCount: "",
  niche: CONTENT_NICHES[0],
  portfolioUrl: "",
  message: "",
  agreed: false,
};

function validateForm(values) {
  const errors = {};

  if (!values.fullName.trim()) errors.fullName = "Full name is required";
  if (!values.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Enter a valid email address";
  }
  if (!values.phone.trim()) {
    errors.phone = "Phone number is required";
  } else if (!/^[\d\s+\-()]{8,15}$/.test(values.phone.trim())) {
    errors.phone = "Enter a valid phone number";
  }
  if (!values.city.trim()) errors.city = "City is required";
  if (!values.handle.trim()) errors.handle = "Social handle is required";

  const followers = Number(values.followerCount);
  if (!values.followerCount) {
    errors.followerCount = "Follower count is required";
  } else if (!Number.isInteger(followers) || followers < 1000) {
    errors.followerCount = "Minimum 1,000 followers required to apply";
  }

  if (!values.agreed) errors.agreed = "Please accept the creator program terms";

  return errors;
}

export default function CreatorRegistrationForm() {
  const { user, profile } = useAuth();
  const reduceMotion = useReducedMotion();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      fullName: prev.fullName || profile?.full_name || user.user_metadata?.full_name || "",
      email: prev.email || profile?.email || user.email || "",
    }));
  }, [user, profile]);

  const detectedTier = useMemo(
    () => getTierFromFollowers(form.followerCount),
    [form.followerCount],
  );

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setResult(null);

    try {
      const payload = {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        city: form.city,
        platform: PLATFORMS.find((p) => p.id === form.platform)?.label ?? form.platform,
        handle: form.handle,
        followerCount: form.followerCount,
        niche: form.niche,
        portfolioUrl: form.portfolioUrl,
        message: form.message,
      };

      const response = submitCreatorApplication(payload);
      setResult(response);
      setForm(initialForm);
    } catch {
      setResult({ ok: false, channel: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="register" className="scroll-mt-28 bg-[#f7f3ee] py-20 md:py-28">
      <div className="container-stitch">
        <motion.div
          className="mx-auto mb-12 max-w-2xl text-center"
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <p className="mb-4 type-label text-[#d4af37]">Join Us</p>
          <h2 className="type-section text-[#130006]">Creator Registration</h2>
          <p className="body-stitch mt-5 text-[#514347]">
            Tell us about yourself and your audience. Applications are reviewed within 48 hours —
            approved creators receive their welcome kit shortly after.
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-12">
          <motion.aside
            className="lg:col-span-2"
            initial={reduceMotion ? false : { opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <motion.div
              className="sticky top-28 rounded-2xl border border-[#130006]/8 bg-[#fdf9f4] p-6 shadow-[0_20px_48px_-16px_rgba(19,0,6,0.08)] sm:p-8"
              layout
            >
              <p className="label-stitch text-[0.68rem] uppercase tracking-[0.14em] text-[#847377]">
                Your detected tier
              </p>

              <AnimatePresence mode="wait">
                {detectedTier ? (
                  <motion.div
                    key={detectedTier.id}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="mt-4"
                  >
                    <h3 className="type-section text-2xl text-[#130006]">{detectedTier.name}</h3>
                    <p className="mt-1 text-sm text-[#847377]">
                      {formatFollowerCount(form.followerCount)} followers · {detectedTier.range} tier
                    </p>
                    <ul className="mt-5 space-y-2.5">
                      {detectedTier.perks.slice(0, 3).map((perk) => (
                        <li key={perk} className="flex gap-2 text-[0.82rem] text-[#514347]">
                          <span className="text-[#d4af37]" aria-hidden="true">
                            ✦
                          </span>
                          {perk}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ) : (
                  <motion.p
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 text-sm leading-relaxed text-[#847377]"
                  >
                    Enter your follower count to see which tier you qualify for. Minimum 1,000
                    followers required.
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.div
                className="mt-8 border-t border-[#130006]/8 pt-6"
                initial={reduceMotion ? false : { opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#847377]">
                  All tiers at a glance
                </p>
                <div className="flex flex-wrap gap-2">
                  {CREATOR_TIERS.map((tier) => (
                    <span
                      key={tier.id}
                      className={`rounded-full px-2.5 py-1 text-[0.62rem] font-medium uppercase tracking-wider ${
                        detectedTier?.id === tier.id
                          ? "bg-[#d4af37]/20 text-[#3d0a21]"
                          : "bg-[#130006]/5 text-[#847377]"
                      }`}
                    >
                      {tier.range}
                    </span>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </motion.aside>

          <motion.div
            className="lg:col-span-3"
            initial={reduceMotion ? false : { opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <AnimatePresence mode="wait">
              {result?.ok ? (
                <motion.div
                  key="success"
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl border border-[#d4af37]/30 bg-[#fdf9f4] p-8 text-center shadow-[0_20px_48px_-16px_rgba(19,0,6,0.08)] sm:p-12"
                >
                  <span className="text-4xl" aria-hidden="true">
                    ✨
                  </span>
                  <h3 className="mt-4 type-section text-[#130006]">Application Submitted</h3>
                  <p className="body-stitch mx-auto mt-3 max-w-md text-[#514347]">
                    Your application was sent via WhatsApp. Our team will confirm your tier and next
                    steps shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => setResult(null)}
                    className="tap-target mt-8 rounded-full border border-[#130006]/20 px-8 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#130006] transition hover:border-[#130006]/40"
                  >
                    Submit Another
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  className="rounded-2xl border border-[#130006]/8 bg-[#fdf9f4] p-6 shadow-[0_20px_48px_-16px_rgba(19,0,6,0.08)] sm:p-8 md:p-10"
                  noValidate
                >
                  {result?.ok === false && (
                    <p className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      Something went wrong. Please try again or contact us on WhatsApp.
                    </p>
                  )}

                  <motion.div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <Field label="Full Name" error={errors.fullName} required>
                      <input
                        className={fieldClass}
                        name="fullName"
                        value={form.fullName}
                        onChange={(e) => updateField("fullName", e.target.value)}
                        placeholder="Your full name"
                        autoComplete="name"
                      />
                    </Field>
                    <Field label="Email Address" error={errors.email} required>
                      <input
                        className={fieldClass}
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        placeholder="you@email.com"
                        autoComplete="email"
                      />
                    </Field>
                    <Field label="Phone / WhatsApp" error={errors.phone} required>
                      <input
                        className={fieldClass}
                        name="phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                        placeholder="+91 98765 43210"
                        autoComplete="tel"
                      />
                    </Field>
                    <Field label="City" error={errors.city} required>
                      <input
                        className={fieldClass}
                        name="city"
                        value={form.city}
                        onChange={(e) => updateField("city", e.target.value)}
                        placeholder="Mumbai, Delhi, Bangalore…"
                        autoComplete="address-level2"
                      />
                    </Field>
                  </motion.div>

                  <motion.div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <Field label="Primary Platform" required>
                      <select
                        className={fieldClass}
                        name="platform"
                        value={form.platform}
                        onChange={(e) => updateField("platform", e.target.value)}
                      >
                        {PLATFORMS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Social Handle" error={errors.handle} required>
                      <input
                        className={fieldClass}
                        name="handle"
                        value={form.handle}
                        onChange={(e) => updateField("handle", e.target.value)}
                        placeholder="@yourusername"
                      />
                    </Field>
                    <Field label="Follower Count" error={errors.followerCount} required>
                      <input
                        className={fieldClass}
                        name="followerCount"
                        type="number"
                        min={1000}
                        step={1}
                        value={form.followerCount}
                        onChange={(e) => updateField("followerCount", e.target.value)}
                        placeholder="e.g. 25000"
                      />
                    </Field>
                    <Field label="Content Niche" required>
                      <select
                        className={fieldClass}
                        name="niche"
                        value={form.niche}
                        onChange={(e) => updateField("niche", e.target.value)}
                      >
                        {CONTENT_NICHES.map((niche) => (
                          <option key={niche} value={niche}>
                            {niche}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </motion.div>

                  <motion.div className="mt-6 flex flex-col gap-2">
                    <label className={labelClass}>Portfolio / Sample Video URL</label>
                    <input
                      className={fieldClass}
                      name="portfolioUrl"
                      type="url"
                      value={form.portfolioUrl}
                      onChange={(e) => updateField("portfolioUrl", e.target.value)}
                      placeholder="https://instagram.com/reel/… or YouTube link"
                    />
                  </motion.div>

                  <motion.div className="mt-6 flex flex-col gap-2">
                    <label className={labelClass}>About Your Content</label>
                    <textarea
                      className={`${fieldClass} min-h-28 resize-none`}
                      name="message"
                      value={form.message}
                      onChange={(e) => updateField("message", e.target.value)}
                      placeholder="Tell us about your style, audience, and why you'd love to create for VELISQA…"
                    />
                  </motion.div>

                  <motion.div className="mt-6">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={form.agreed}
                        onChange={(e) => updateField("agreed", e.target.checked)}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-[#130006]/30 accent-[#3d0a21]"
                      />
                      <span className="text-[0.82rem] leading-relaxed text-[#514347]">
                        I agree to create authentic UGC content featuring VELISQA jewellery, follow
                        campaign guidelines, and understand that perks are tier-based and subject to
                        approval.
                      </span>
                    </label>
                    {errors.agreed && (
                      <p className="mt-1.5 text-xs text-red-600" role="alert">
                        {errors.agreed}
                      </p>
                    )}
                  </motion.div>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[0.75rem] text-[#847377]">
                      Minimum 1,000 followers · Review within 48 hrs
                    </p>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="tap-target w-full rounded-full bg-[#3d0a21] px-10 py-4 label-stitch text-[0.72rem] uppercase tracking-[0.16em] text-[#fdf9f4] transition hover:bg-[#2a0718] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      {submitting ? "Submitting…" : "Submit Application"}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, error, required, children }) {
  return (
    <motion.div className="flex flex-col gap-2">
      <label className={labelClass}>
        {label}
        {required && <span className="text-[#d4af37]"> *</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </motion.div>
  );
}
