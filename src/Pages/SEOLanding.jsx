import { Link, Navigate, useParams } from "react-router-dom";
import SEOHead from "../Components/SEO/SEOHead";
import { buildBreadcrumbSchema } from "../Components/SEO/schemaBuilders";
import { landingPages } from "../Components/SEO/seoData";
import WhatsAppCTA from "../Components/WhatsApp/WhatsAppCTA";

const SITE_URL = "https://www.velisqa.com";

function buildFaqSchema(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    })),
  };
}

function buildLandingPageSchema(page) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: page.title,
    headline: page.title,
    description: page.description,
    url: `${SITE_URL}/${page.slug}`,
    about: page.keywords.map((keyword) => ({ "@type": "Thing", name: keyword })),
    isPartOf: {
      "@id": `${SITE_URL}/#website`,
    },
  };
}

export default function SEOLanding() {
  const { slug } = useParams();
  const page = landingPages.find((item) => item.slug === slug);

  if (!page) return <Navigate to="/collections" replace />;

  return (
    <main className="bg-[#fdf9f4] text-[#130006]">
      <SEOHead
        title={page.metaTitle}
        description={page.description}
        keywords={page.keywords}
        canonicalPath={`/${page.slug}`}
        schema={[
          buildLandingPageSchema(page),
          buildFaqSchema(page.faqs),
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: page.title, path: `/${page.slug}` },
          ]),
        ]}
      />

      <section className="container-stitch py-16 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 type-label text-[#847377]">{page.eyebrow}</p>
          <h1 className="type-display text-[#130006]">{page.title}</h1>
          <p className="mx-auto mt-6 max-w-3xl type-body-luxury text-[#514347]">{page.hero}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/collections"
              className="tap-target inline-flex items-center justify-center rounded-full bg-[#3d0a21] px-7 py-3 type-button text-[#f7ead0] transition hover:bg-[#130006]"
            >
              Explore Collections
            </Link>
            <WhatsAppCTA intent="consult" className="px-7 py-3">
              Private Assistance
            </WhatsAppCTA>
          </div>
        </div>
      </section>

      <section className="container-stitch pb-16 md:pb-24">
        <div className="grid gap-8 md:grid-cols-2">
          {page.sections.map((section) => (
            <article key={section.heading} className="border-t border-[#d4af37]/30 pt-6">
              <h2 className="font-serif text-3xl leading-tight text-[#130006]">{section.heading}</h2>
              <p className="mt-4 type-body-luxury text-[#514347]">{section.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#3d0a21] py-16 text-[#f7ead0] md:py-20">
        <div className="container-stitch">
          <div className="mx-auto max-w-4xl">
            <p className="type-label text-[#e9c349]">Search Focus</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">VELISQA jewellery expertise</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {page.keywords.map((keyword) => (
                <Link
                  key={keyword}
                  to="/collections"
                  className="border border-[#e9c349]/20 px-5 py-4 text-sm font-medium tracking-[0.08em] text-[#f7ead0] transition hover:border-[#e9c349]/60"
                >
                  {keyword}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-stitch py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-serif text-4xl leading-tight text-[#130006]">Frequently asked questions</h2>
          <div className="mt-8 space-y-5">
            {page.faqs.map(([question, answer]) => (
              <details key={question} className="border-b border-[#d4af37]/30 pb-5">
                <summary className="cursor-pointer font-serif text-2xl text-[#130006]">{question}</summary>
                <p className="mt-3 type-body-luxury text-[#514347]">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
