import { productPath } from "../../lib/productUrl";
import {
  CONTACT_EMAIL,
  DEFAULT_OG_IMAGE,
  LOGO_URL,
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
    logo: LOGO_URL,
    image: DEFAULT_OG_IMAGE,
    description:
      "Velisqa is a modern fashion jewellery brand from India. Shop necklaces, earrings, rings, bracelets and bangles online with secure payment and delivery across India.",
    slogan: "Crafted to Captivate",
    email: CONTACT_EMAIL,
    telephone: WHATSAPP_PHONE,
    sameAs: [INSTAGRAM_URL],
    priceRange: "₹₹₹",
    currenciesAccepted: "INR",
    paymentAccepted: "UPI, Credit Card, Debit Card, Net Banking, Cash on Delivery",
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
      url: `${SITE_URL}/contact`,
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
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
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

export function buildProductDetailSchema({ product, name, images, image, description, url }) {
  const rating = Number(product?.rating)
  const reviewCount = Number(product?.review_count)
  const soldOut = product?.out_of_stock === true || Number(product?.stock) <= 0
  const imageList = (images?.length ? images : [image]).filter(Boolean)
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: name || product?.name,
    image: imageList,
    description,
    sku: product?.id,
    brand: { "@type": "Brand", name: "Velisqa" },
    category: product?.category,
    ...(product?.colour ? { color: product.colour } : {}),
    ...(product?.metal ? { material: product.metal } : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "INR",
      price: String(Number(product?.price) || 0),
      availability: soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": `${SITE_URL}/#organization` },
      // A sale price shows the MRP as a strikethrough in Google results.
      ...(Number(product?.mrp) > Number(product?.price)
        ? {
            priceSpecification: [
              { "@type": "UnitPriceSpecification", price: String(Number(product.price)), priceCurrency: "INR" },
              {
                "@type": "UnitPriceSpecification",
                priceType: "https://schema.org/StrikethroughPrice",
                price: String(Number(product.mrp)),
                priceCurrency: "INR",
              },
            ],
          }
        : {}),
      priceValidUntil: `${new Date().getFullYear() + 1}-12-31`,
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "MonetaryAmount", value: "0", currency: "INR" },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
        // Matches the 3–5 day estimate shown on product pages and at checkout.
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 3, maxValue: 4, unitCode: "DAY" },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "IN",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 5,
        returnMethod: "https://schema.org/ReturnByMail",
      },
    },
  };

  if (Number.isFinite(rating) && rating > 0 && Number.isFinite(reviewCount) && reviewCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating,
      reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return schema;
}

export function buildFoundersPageSchema() {
  const sameer = {
    "@type": "Person",
    name: "Sameer Shameem",
    url: "https://sameer-portfolio-dun.vercel.app/",
        worksFor: { "@id": `${SITE_URL}/#organization` },
    sameAs: ["https://www.linkedin.com/in/sameer-shameem-4309bb340"],
    image: `${SITE_URL}/media/founder-sameer-shameem-1023.webp`,
    jobTitle: "Co-founder",
  };

  const atif = {
    "@type": "Person",
    name: "Atif Afsar",
    url: "https://portfolio-rgzt.vercel.app/",
        worksFor: { "@id": `${SITE_URL}/#organization` },
    sameAs: [
      "https://www.linkedin.com/in/atif-afsar-64903b33a?originalSubdomain=in",
    ],
    image: `${SITE_URL}/media/founder-atif-afsar-1024.webp`,
    jobTitle: "Co-founder",
  };

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "Velisqa Jewellery",
    url: SITE_URL,
    founder: [sameer, atif],
  };
}

/** ItemList for category / listing pages (summary-page pattern: URLs only). */
export function buildItemListSchema(products, { name } = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    ...(name ? { name } : {}),
    itemListElement: (products ?? []).slice(0, 30).map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_URL}${productPath(product)}`,
    })),
  };
}
