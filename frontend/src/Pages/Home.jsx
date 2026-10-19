import HomeContent from "../Components/Home/HomeContent";
import SEOHead from "../Components/SEO/SEOHead";
import { pageSeo } from "../Components/SEO/seoData";
import { buildFaqSchema } from "../Components/SEO/schemaBuilders";
import { HOME_FAQS } from "../data/homeFaqs";

const HOME_SCHEMA = [buildFaqSchema(HOME_FAQS)];

export default function Home() {
  // Organization + WebSite (with SearchAction) JSON-LD are added by SEOHead on every page.
  return (
    <>
      <SEOHead {...pageSeo.home} schema={HOME_SCHEMA} />
      <HomeContent />
    </>
  );
}
