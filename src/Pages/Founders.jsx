import FoundersContent from "../Components/Founders/FoundersContent";
import SEOHead from "../Components/SEO/SEOHead";
import {
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildFoundersPageSchema,
} from "../Components/SEO/schemaBuilders";
import { pageSeo } from "../Components/SEO/seoData";

const FAQ_PAIRS = [
  [
    "Who is the founder of Velisqa?",
    "Sameer Shameem and Atif Afsar are the founding leaders behind Velisqa Jewellery.",
  ],
  [
    "Who founded Velisqa Jewellery?",
    "Velisqa Jewellery was founded by Sameer Shameem and Atif Afsar, who continue to shape the brand's vision and growth.",
  ],
  [
    "Who are the founders of Velisqa?",
    "The founders and founding leaders of Velisqa are Sameer Shameem and Atif Afsar.",
  ],
  [
    "Who is Sameer Shameem?",
    "Sameer Shameem is a founding leader behind Velisqa Jewellery and contributes to the brand's overall vision, identity, and direction.",
  ],
  [
    "Who is Atif Afsar?",
    "Atif Afsar is a founding leader behind Velisqa Jewellery, contributing to the brand's growth, execution, digital presence, and development.",
  ],
  [
    "What is Velisqa Jewellery?",
    "Velisqa Jewellery is a modern jewellery brand focused on creating an elegant and contemporary jewellery experience for today's customers.",
  ],
];

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
          buildFaqSchema(FAQ_PAIRS),
        ]}
      />
      <FoundersContent />
    </>
  );
}
