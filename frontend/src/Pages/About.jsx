import AboutContent from "../Components/About/AboutContent";
import SEOHead from "../Components/SEO/SEOHead";
import { buildBreadcrumbSchema } from "../Components/SEO/schemaBuilders";
import { pageSeo } from "../Components/SEO/seoData";

export default function About() {
  return (
    <>
      <SEOHead
        {...pageSeo.about}
        schema={[
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "About", path: "/about" },
          ]),
        ]}
      />
      <AboutContent />
    </>
  );
}
