const SITE_URL = "https://www.velisqa.com";
const DEFAULT_IMAGE = `${SITE_URL}/images/logo.png`;

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "JewelryStore"],
    "@id": `${SITE_URL}/#organization`,
    name: "VELISQA",
    alternateName: ["VELISQA Jewellery", "Velisqa Jewellery"],
    url: SITE_URL,
    logo: DEFAULT_IMAGE,
    image: DEFAULT_IMAGE,
    sameAs: ["https://www.instagram.com/velisqa.in/"],
    areaServed: [
      { "@type": "City", name: "Aligarh" },
      { "@type": "AdministrativeArea", name: "Uttar Pradesh" },
      { "@type": "Country", name: "India" },
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Aligarh",
      addressRegion: "Uttar Pradesh",
      addressCountry: "IN",
    },
    description:
      "VELISQA is a luxury artificial jewellery and fashion jewellery brand serving Aligarh, Uttar Pradesh and India-wide buyers.",
    brand: {
      "@type": "Brand",
      name: "VELISQA",
    },
    priceRange: "INR",
  };
}

export function buildWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: "VELISQA",
    alternateName: "VELISQA Jewellery",
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/collections?search={search_term_string}`,
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
    name: "VELISQA Luxury Artificial Jewellery Collection",
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        name: product.name,
        image: product.image.startsWith("http") ? product.image : `${SITE_URL}${product.image}`,
        description: product.description,
        brand: {
          "@type": "Brand",
          name: "VELISQA",
        },
        category: product.category,
        offers: {
          "@type": "Offer",
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
          url: `${SITE_URL}/collections?category=${product.category.toLowerCase()}`,
        },
      },
    })),
  };
}
