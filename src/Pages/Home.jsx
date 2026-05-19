import HomeContent from "../Components/Home/HomeContent";
import SEOHead from "../Components/SEO/SEOHead";
import { buildBreadcrumbSchema, buildProductSchema } from "../Components/SEO/schemaBuilders";
import { pageSeo, seoProducts } from "../Components/SEO/seoData";

export default function Home() {
  return (
    <>
      <SEOHead
        {...pageSeo.home}
        schema={[
          buildProductSchema(seoProducts),
          buildBreadcrumbSchema([{ name: "Home", path: "/" }]),
        ]}
      />
      <HomeContent />
    </>
  );
}
