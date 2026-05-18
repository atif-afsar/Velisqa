import HomeContent from "../Components/Home/HomeContent";
import SEOHead from "../Components/SEO/SEOHead";
import { buildBreadcrumbSchema } from "../Components/SEO/schemaBuilders";
import { pageSeo } from "../Components/SEO/seoData";

export default function Home() {
  return (
    <>
      <SEOHead
        {...pageSeo.home}
        schema={[
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
          ]),
        ]}
      />
      <HomeContent />
    </>
  );
}
