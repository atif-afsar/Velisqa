import LegalPageLayout from "../Components/Legal/LegalPageLayout";
import SEOHead from "../Components/SEO/SEOHead";
import { buildBreadcrumbSchema } from "../Components/SEO/schemaBuilders";
import { legalPages } from "../Components/Legal/legalContent";
import { pageSeo } from "../Components/SEO/seoData";

export default function ShippingDelivery() {
  return (
    <>
      <SEOHead
        {...pageSeo.shippingDelivery}
        schema={[
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Shipping & Delivery Policy", path: "/shipping-delivery" },
          ]),
        ]}
      />
      <LegalPageLayout page={legalPages.shippingDelivery} />
    </>
  );
}
