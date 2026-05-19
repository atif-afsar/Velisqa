import LegalPageLayout from "../Components/Legal/LegalPageLayout";
import SEOHead from "../Components/SEO/SEOHead";
import { buildBreadcrumbSchema } from "../Components/SEO/schemaBuilders";
import { pageSeo } from "../Components/SEO/seoData";
import { legalPages } from "../Components/Legal/legalContent";

export default function Privacy() {
  return (
    <>
      <SEOHead
        {...pageSeo.privacy}
        schema={[
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Privacy Policy", path: "/privacy" },
          ]),
        ]}
      />
      <LegalPageLayout page={legalPages.privacy} />
    </>
  );
}
