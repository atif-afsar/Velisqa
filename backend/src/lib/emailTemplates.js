/**
 * Email templates. Table layout + inline styles only: that is what Gmail/Outlook/Apple Mail render reliably.
 * Palette follows the storefront (ink #111, paper #fff, mist #fafaf8, turquoise accent #1fa79a).
 */
const INK = '#111111'
const BODY = '#3f3f3f'
const MUTED = '#6b6b6b'
const LINE = '#eaeaea'
const MIST = '#fafaf8'
const ACCENT = '#1fa79a'
const ACCENT_TINT = '#e8f6f4'
const FONT = "Georgia,'Times New Roman',serif"
const SANS = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif"

export const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const rupees = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`

function layout({ preheader, bodyHtml, footerHtml }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>Velisqa</title></head>
<body style="margin:0;padding:0;background:${MIST};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${MIST};"><tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${LINE};">
    <tr><td align="center" style="padding:30px 24px 22px;border-bottom:1px solid ${LINE};">
      <span style="font-family:${FONT};font-size:26px;letter-spacing:6px;color:${INK};text-transform:uppercase;">Velisqa</span>
    </td></tr>
    ${bodyHtml}
    <tr><td style="padding:22px 28px 28px;border-top:1px solid ${LINE};font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTED};text-align:center;">${footerHtml}</td></tr>
  </table>
</td></tr></table>
</body></html>`
}

const button = (href, label) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr><td align="center" bgcolor="${INK}" style="background:${INK};">
    <a href="${escapeHtml(href)}" style="display:inline-block;padding:15px 38px;font-family:${SANS};font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>
  </td></tr></table>`

/**
 * @param {{ items: {name: string, image?: string|null, quantity: number, lineTotal: number}[], couponCode: string,
 *   percent: number, minSubtotal?: number, expiresAt: Date, resumeUrl: string, unsubscribeUrl: string }} data
 */
export function renderAbandonedCartEmail({ items, couponCode, percent, minSubtotal = 0, expiresAt, resumeUrl, unsubscribeUrl }) {
  const expiry = new Date(expiresAt).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  const subject = `Your Velisqa bag is waiting — ${percent}% off inside`
  const minNote = minSubtotal > 0 ? ` on orders above ${rupees(minSubtotal)}` : ''

  const rows = items
    .slice(0, 4)
    .map(
      (item) => `<tr>
        <td width="84" style="padding:12px 0;border-bottom:1px solid ${LINE};">${
          item.image
            ? `<img src="${escapeHtml(item.image)}" width="72" height="72" alt="" style="display:block;width:72px;height:72px;object-fit:cover;border:1px solid ${LINE};">`
            : `<div style="width:72px;height:72px;background:${MIST};border:1px solid ${LINE};"></div>`
        }</td>
        <td style="padding:12px 12px;border-bottom:1px solid ${LINE};font-family:${SANS};font-size:14px;color:${INK};line-height:1.45;">${escapeHtml(item.name)}<br><span style="color:${MUTED};font-size:12px;">Qty ${Number(item.quantity)}</span></td>
        <td align="right" style="padding:12px 0;border-bottom:1px solid ${LINE};font-family:${SANS};font-size:14px;color:${INK};white-space:nowrap;">${rupees(item.lineTotal)}</td>
      </tr>`,
    )
    .join('')
  const more = items.length > 4 ? `<p style="margin:10px 0 0;font-family:${SANS};font-size:12px;color:${MUTED};">+ ${items.length - 4} more in your bag</p>` : ''

  const bodyHtml = `
    <tr><td style="padding:34px 28px 8px;text-align:center;">
      <h1 style="margin:0 0 12px;font-family:${FONT};font-weight:normal;font-size:27px;line-height:1.3;color:${INK};">Still thinking it over?</h1>
      <p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.7;color:${BODY};">You left a few pieces in your bag. We’ve kept them aside, and added a little something to help you decide.</p>
    </td></tr>
    <tr><td style="padding:18px 28px 6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>${more}</td></tr>
    <tr><td style="padding:22px 28px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${ACCENT_TINT};border:1px dashed ${ACCENT};"><tr><td align="center" style="padding:22px 16px;">
        <div style="font-family:${SANS};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#12786e;">Your personal offer · ${percent}% off${escapeHtml(minNote)}</div>
        <div style="margin:10px 0 6px;font-family:'Courier New',monospace;font-size:26px;letter-spacing:4px;font-weight:bold;color:${INK};">${escapeHtml(couponCode)}</div>
        <div style="font-family:${SANS};font-size:12px;color:${MUTED};">Valid for you only, one use, until ${escapeHtml(expiry)} IST</div>
      </td></tr></table>
    </td></tr>
    <tr><td style="padding:22px 28px 10px;">${button(resumeUrl, 'Complete my order')}</td></tr>
    <tr><td style="padding:6px 28px 34px;text-align:center;font-family:${SANS};font-size:13px;line-height:1.7;color:${MUTED};">Easy 5-day returns · Secure online payment or Cash on Delivery</td></tr>`

  const footerHtml = `You’re receiving this because you started a checkout at Velisqa and agreed to hear from us.<br>
    <a href="${escapeHtml(unsubscribeUrl)}" style="color:${MUTED};text-decoration:underline;">Unsubscribe</a> &nbsp;·&nbsp; Velisqa, Aligarh, India`

  const text = [
    'Still thinking it over?',
    '',
    'You left a few pieces in your Velisqa bag:',
    ...items.slice(0, 4).map((item) => `- ${item.name} x${item.quantity} (${rupees(item.lineTotal)})`),
    '',
    `Your personal offer: ${percent}% off${minNote} with code ${couponCode}`,
    `Valid for you only, one use, until ${expiry} IST.`,
    '',
    `Complete your order: ${resumeUrl}`,
    '',
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join('\n')

  return { subject, html: layout({ preheader: `Use code ${couponCode} for ${percent}% off — your bag is saved.`, bodyHtml, footerHtml }), text }
}

export function renderPasswordResetEmail({ link }) {
  const bodyHtml = `
    <tr><td style="padding:34px 28px 8px;text-align:center;">
      <h1 style="margin:0 0 12px;font-family:${FONT};font-weight:normal;font-size:26px;color:${INK};">Reset your password</h1>
      <p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.7;color:${BODY};">We received a request to reset your Velisqa password. This link is valid for 1 hour.</p>
    </td></tr>
    <tr><td style="padding:24px 28px 12px;">${button(link, 'Set a new password')}</td></tr>
    <tr><td style="padding:6px 28px 30px;text-align:center;font-family:${SANS};font-size:13px;line-height:1.7;color:${MUTED};">If you didn’t ask for this, you can safely ignore this email — your password won’t change.</td></tr>`
  const footerHtml = 'This is a security email from Velisqa. Please don’t forward it.'
  const text = `We received a request to reset your Velisqa password.\n\nSet a new password here (valid for 1 hour):\n${link}\n\nIf you did not ask for this, you can ignore this email.`
  return { subject: 'Reset your Velisqa password', html: layout({ preheader: 'Set a new password for your Velisqa account.', bodyHtml, footerHtml }), text }
}
