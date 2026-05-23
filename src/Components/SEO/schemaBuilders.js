import {
  CONTACT_EMAIL,
  DEFAULT_OG_IMAGE,
  INSTAGRAM_URL,
  SITE_URL,
  WHATSAPP_PHONE,
} from "./siteConfig";

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "JewelryStore", "LocalBusiness"],
    "@id": `${SITE_URL}/#organization`,
    name: "VELISQA",
    alternateName: ["Velisqa", "Velisqa Jewellery", "VELISQA Jewellery"],
    url: SITE_URL,
    logo: DEFAULT_OG_IMAGE,
    image: DEFAULT_OG_IMAGE,
    description:
      "Velisqa is a luxury artificial jewellery and premium fashion jewellery brand. Shop rings, necklaces, bangles, and earrings with WhatsApp ordering across India.",
    slogan: "Crafted to Captivate",
    email: CONTACT_EMAIL,
    telephone: WHATSAPP_PHONE,
    sameAs: [INSTAGRAM_URL],
    priceRange: "₹₹₹",
    currenciesAccepted: "INR",
    paymentAccepted: "Cash, UPI, Bank Transfer",
    areaServed: { "@type": "Country", name: "India" },
    address: {
      "@type": "PostalAddress",
      streetAddress: "Palladium Mall, Level 2, Senapati Bapat Marg, Lower Parel",
      addressLocality: "Mumbai",
      postalCode: "400013",
      addressRegion: "Maharashtra",
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 18.9932,
      longitude: 72.8235,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "11:00",
        closes: "20:00",
      },
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: WHATSAPP_PHONE,
      email: CONTACT_EMAIL,
      contactType: "customer service",
      areaServed: "IN",
      availableLanguage: ["English", "Hindi"],
      url: `${SITE_URL}/order`,
    },
    brand: { "@type": "Brand", name: "VELISQA" },
  };
}

export function buildWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: "Velisqa Jewellery",
    alternateName: ["VELISQA", "Velisqa", "VELISQA Jewellery"],
    description: "Official Velisqa jewellery website — premium artificial jewellery for women in India.",
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "en-IN",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/collections?category={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildBreadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function buildProductSchema(products) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Velisqa Jewellery Collection",
    description: "Premium artificial jewellery including necklaces, rings, bangles, and earrings.",
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        name: `Velisqa ${product.name}`,
        image: product.image.startsWith("http") ? product.image : `${SITE_URL}${product.image}`,
        description: product.description,
        brand: { "@type": "Brand", name: "Velisqa" },
        category: product.category,
        offers: {
          "@type": "Offer",
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
          url: `${SITE_URL}/order`,
          seller: { "@id": `${SITE_URL}/#organization` },
        },
      },
    })),
  };
}

export function buildFaqSchema(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}
