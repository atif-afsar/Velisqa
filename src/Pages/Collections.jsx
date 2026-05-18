import CollectionsContent from "../Components/Collections/CollectionsContent";
import SEOHead from "../Components/SEO/SEOHead";
import { buildBreadcrumbSchema, buildProductSchema } from "../Components/SEO/schemaBuilders";
import { pageSeo, seoProducts } from "../Components/SEO/seoData";

export default function Collections() {
  return (
    <>
      <SEOHead
        {...pageSeo.collections}
        schema={[
          buildProductSchema(seoProducts),
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Collections", path: "/collections" },
          ]),
        ]}
      />
      <CollectionsContent />
    </>
  );
}
