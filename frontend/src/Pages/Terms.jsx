import LegalPageLayout from "../Components/Legal/LegalPageLayout";
import SEOHead from "../Components/SEO/SEOHead";
import { buildBreadcrumbSchema } from "../Components/SEO/schemaBuilders";
import { pageSeo } from "../Components/SEO/seoData";
import { legalPages } from "../Components/Legal/legalContent";

export default function Terms() {
  return (
    <>
      <SEOHead
        {...pageSeo.terms}
        schema={[
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Terms of Service", path: "/terms" },
          ]),
        ]}
      />
      <LegalPageLayout page={legalPages.terms} />
    </>
  );
}
