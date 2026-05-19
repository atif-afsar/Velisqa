import LegalPageLayout from "../Components/Legal/LegalPageLayout";
import SEOHead from "../Components/SEO/SEOHead";
import { buildBreadcrumbSchema } from "../Components/SEO/schemaBuilders";
import { pageSeo } from "../Components/SEO/seoData";
import { legalPages } from "../Components/Legal/legalContent";

export default function Authenticity() {
  return (
    <>
      <SEOHead
        {...pageSeo.authenticity}
        schema={[
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Authenticity", path: "/authenticity" },
          ]),
        ]}
      />
      <LegalPageLayout page={legalPages.authenticity} />
    </>
  );
}
