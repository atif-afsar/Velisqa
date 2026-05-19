import { useState } from "react";
import { Link } from "react-router-dom";
import HomeFooter from "../Home/HomeFooter";
import { legalPages } from "./legalContent";

const page = legalPages.faq;

function FaqItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className="border-b border-[#847377]/10 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="tap-target flex w-full items-center justify-between gap-4 py-4 text-left sm:py-5"
        aria-expanded={isOpen}
      >
        <span className="font-serif text-base font-bold text-[#130006] sm:text-lg">{question}</span>
        <span className="shrink-0 text-xl font-light text-[#d4af37]" aria-hidden>
          {isOpen ? "−" : "+"}
        </span>
      </button>
      {isOpen && (
        <p className="pb-4 text-sm font-semibold leading-relaxed text-[#514347] sm:pb-5 sm:text-[0.95rem]">
          {answer}
        </p>
      )}
    </div>
  );
}

export default function FaqPageContent() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <main className="bg-[#f9f5f0] text-[#130006]">
      <section className="relative overflow-hidden border-b border-[#d4af37]/15 bg-[#3d0a21] px-4 py-14 text-[#f7ead0] sm:px-6 sm:py-16 md:py-20">
        <div className="container-stitch relative">
          <Link
            to="/"
            className="mb-6 inline-flex text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4af37]/80 hover:text-[#d4af37]"
          >
            ← Back to Home
          </Link>
          <p className="type-label text-[#d4af37]">{page.eyebrow}</p>
          <h1 className="mt-3 font-serif text-3xl font-bold sm:text-4xl md:text-5xl">{page.title}</h1>
          <p className="mt-4 max-w-2xl text-sm font-semibold text-white/70 sm:text-base">{page.description}</p>
        </div>
      </section>

      <div className="container-stitch page-offset-nav px-4 py-10 sm:px-6 sm:py-12 md:py-14">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#d4af37]/15 bg-white/60 p-5 shadow-[0_12px_40px_rgba(19,0,6,0.06)] sm:p-8">
          {page.faqItems.map(([question, answer], index) => (
            <FaqItem
              key={question}
              question={question}
              answer={answer}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? -1 : index)}
            />
          ))}
        </div>

        <div className="mx-auto mt-10 flex max-w-3xl flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/collections"
            className="tap-target inline-flex justify-center rounded-full bg-[#3d0a21] px-8 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#f7ead0]"
          >
            Shop Collections
          </Link>
          <Link
            to="/order"
            className="tap-target inline-flex justify-center rounded-full border border-[#3d0a21] px-8 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#3d0a21]"
          >
            Order on WhatsApp
          </Link>
        </div>
      </div>

      <HomeFooter />
    </main>
  );
}
