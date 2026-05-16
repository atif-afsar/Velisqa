export default function TrustBadge({ text }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full bg-[#fff8f2]/60 px-3 py-2 text-sm text-[#514347] shadow-inner">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M12 1.75l2.9 5.88 6.5.95-4.7 4.58 1.11 6.46L12 17.77 6.19 19.62 7.3 13.16 2.6 8.58l6.5-.95L12 1.75z" fill="#d4af37" />
      </svg>
      <span className="font-medium">{text}</span>
    </div>
  );
}
