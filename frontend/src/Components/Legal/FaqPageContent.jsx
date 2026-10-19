import { useState } from "react";
import { Link } from "react-router-dom";
import { legalPages } from "./legalContent";

const page = legalPages.faq;

function FaqItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className="border-b border-muted/10 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="tap-target flex w-full items-center justify-between gap-4 py-4 text-left sm:py-5"
        aria-expanded={isOpen}
      >
        <span className="font-serif text-base font-bold text-ink sm:text-lg">{question}</span>
        <span className="shrink-0 text-xl font-light text-muted" aria-hidden>
          {isOpen ? "−" : "+"}
        </span>
      </button>
      {isOpen && (
        <p className="pb-4 text-sm font-semibold leading-relaxed text-body sm:pb-5 sm:text-[0.95rem]">
          {answer}
        </p>
      )}
    </div>
  );
}

export default function FaqPageContent() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <main className="bg-mist text-ink">
      <section className="relative overflow-hidden border-b border-line bg-ink px-4 py-14 text-white sm:px-6 sm:py-16 md:py-20">
        <div className="container-stitch relative">
          <Link
            to="/"
            className="mb-6 inline-flex text-[10px] font-bold uppercase tracking-[0.2em] text-muted hover:text-accent-ink"
          >
            ← Back to Home
          </Link>
          <p className="type-label text-muted">{page.eyebrow}</p>
          <h1 className="mt-3 font-serif text-3xl font-bold sm:text-4xl md:text-5xl">{page.title}</h1>
          <p className="mt-4 max-w-2xl text-sm font-semibold text-white/70 sm:text-base">{page.description}</p>
        </div>
      </section>

      <div className="container-stitch page-offset-nav px-4 py-10 sm:px-6 sm:py-12 md:py-14">
        <div className="mx-auto max-w-3xl border border-line bg-white/60 p-5 sm:p-8">
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
            className="tap-target inline-flex justify-center bg-ink px-8 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white"
          >
            Shop Collections
          </Link>
          <Link
            to="/order"
            className="tap-target inline-flex justify-center border border-ink px-8 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-ink"
          >
            Order on WhatsApp
          </Link>
        </div>
      </div>

    </main>
  );
}
