import HomeContent from "../Components/Home/HomeContent";
import SEOHead from "../Components/SEO/SEOHead";
import { pageSeo } from "../Components/SEO/seoData";

export default function Home() {
  // Organization + WebSite (with SearchAction) JSON-LD are added by SEOHead on every page.
  return (
    <>
      <SEOHead {...pageSeo.home} />
      <HomeContent />
    </>
  );
}
