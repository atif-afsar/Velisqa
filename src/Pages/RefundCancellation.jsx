import LegalPageLayout from "../Components/Legal/LegalPageLayout";
import SEOHead from "../Components/SEO/SEOHead";
import { buildBreadcrumbSchema } from "../Components/SEO/schemaBuilders";
import { legalPages } from "../Components/Legal/legalContent";
import { pageSeo } from "../Components/SEO/seoData";

export default function RefundCancellation() {
  return (
    <>
      <SEOHead
        {...pageSeo.refundCancellation}
        schema={[
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Refund & Cancellation Policy", path: "/refund-cancellation" },
          ]),
        ]}
      />
      <LegalPageLayout page={legalPages.refundCancellation} />
    </>
  );
}
