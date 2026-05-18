import ModelsContent from "../Components/Models/ModelsContent";
import SEOHead from "../Components/SEO/SEOHead";
import { buildBreadcrumbSchema } from "../Components/SEO/schemaBuilders";
import { pageSeo } from "../Components/SEO/seoData";

export default function Models() {
  return (
    <>
      <SEOHead
        {...pageSeo.models}
        schema={[
          buildBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Models", path: "/models" },
          ]),
        ]}
      />
      <ModelsContent />
    </>
  );
}
