import LegalPageLayout from "../Components/Legal/LegalPageLayout";
import SEOHead from "../Components/SEO/SEOHead";
import { buildBreadcrumbSchema } from "../Components/SEO/schemaBuilders";
import { legalPages } from "../Components/Legal/legalContent";
import { pageSeo } from "../Components/SEO/seoData";

export default function Shipping() {
  return (
    <>
      <SEOHead
        {...pageSeo.shipping}
        schema={[
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Shipping & Returns", path: "/shipping-returns" },
          ]),
        ]}
      />
      <LegalPageLayout page={legalPages.shipping} />
    </>
  );
}
