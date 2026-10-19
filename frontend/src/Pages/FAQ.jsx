import FaqPageContent from "../Components/Legal/FaqPageContent";
import SEOHead from "../Components/SEO/SEOHead";
import { buildBreadcrumbSchema, buildFaqSchema } from "../Components/SEO/schemaBuilders";
import { legalPages } from "../Components/Legal/legalContent";
import { pageSeo } from "../Components/SEO/seoData";

export default function FAQ() {
  return (
    <>
      <SEOHead
        {...pageSeo.faq}
        schema={[
          buildFaqSchema(legalPages.faq.faqItems),
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "FAQ", path: "/faq" },
          ]),
        ]}
      />
      <FaqPageContent />
    </>
  );
}
