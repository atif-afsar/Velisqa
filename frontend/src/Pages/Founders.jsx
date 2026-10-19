import FoundersContent from "../Components/Founders/FoundersContent";
import SEOHead from "../Components/SEO/SEOHead";
import {
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildFoundersPageSchema,
} from "../Components/SEO/schemaBuilders";
import { pageSeo } from "../Components/SEO/seoData";
import { FOUNDER_FAQS } from "../data/founders";

export default function Founders() {
  return (
    <>
      <SEOHead
        {...pageSeo.founders}
        schema={[
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Founders", path: "/founders" },
          ]),
          buildFoundersPageSchema(),
          buildFaqSchema(FOUNDER_FAQS),
        ]}
      />
      <FoundersContent />
    </>
  );
}
