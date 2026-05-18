import ContactContent from "../Components/Contact/ContactContent";
import SEOHead from "../Components/SEO/SEOHead";
import { buildBreadcrumbSchema } from "../Components/SEO/schemaBuilders";
import { pageSeo } from "../Components/SEO/seoData";

export default function Contact() {
  return (
    <>
      <SEOHead
        {...pageSeo.contact}
        schema={[
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Contact", path: "/contact" },
          ]),
        ]}
      />
      <ContactContent />
    </>
  );
}
