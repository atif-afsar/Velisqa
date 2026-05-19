import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { buildOrganizationSchema, buildWebsiteSchema } from "./schemaBuilders";
import { DEFAULT_OG_IMAGE, SITE_URL } from "./siteConfig";

const DEFAULT_IMAGE = DEFAULT_OG_IMAGE;

function upsertMeta(selector, createMeta, attrs) {
  let node = document.head.querySelector(selector);

  if (!node) {
    node = createMeta();
    document.head.appendChild(node);
  }

  Object.entries(attrs).forEach(([key, value]) => {
    if (value) node.setAttribute(key, value);
  });
}

function upsertJsonLd(id, schema) {
  let node = document.getElementById(id);

  if (!node) {
    node = document.createElement("script");
    node.id = id;
    node.type = "application/ld+json";
    document.head.appendChild(node);
  }

  node.textContent = JSON.stringify(schema);
}

function removeJsonLd(id) {
  document.getElementById(id)?.remove();
}

export default function SEOHead({
  title,
  description,
  keywords = [],
  canonicalPath,
  image = DEFAULT_IMAGE,
  type = "website",
  schema = [],
}) {
  const location = useLocation();
  const canonicalUrl = `${SITE_URL}${canonicalPath ?? location.pathname}`;

  useEffect(() => {
    document.documentElement.lang = "en-IN";
    document.title = title;

    upsertMeta('meta[name="description"]', () => document.createElement("meta"), {
      name: "description",
      content: description,
    });
    upsertMeta('meta[name="keywords"]', () => document.createElement("meta"), {
      name: "keywords",
      content: keywords.join(", "),
    });
    upsertMeta('meta[name="robots"]', () => document.createElement("meta"), {
      name: "robots",
      content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    });

    upsertMeta('link[rel="canonical"]', () => document.createElement("link"), {
      rel: "canonical",
      href: canonicalUrl,
    });

    upsertMeta('meta[property="og:title"]', () => document.createElement("meta"), {
      property: "og:title",
      content: title,
    });
    upsertMeta('meta[property="og:description"]', () => document.createElement("meta"), {
      property: "og:description",
      content: description,
    });
    upsertMeta('meta[property="og:type"]', () => document.createElement("meta"), {
      property: "og:type",
      content: type,
    });
    upsertMeta('meta[property="og:url"]', () => document.createElement("meta"), {
      property: "og:url",
      content: canonicalUrl,
    });
    upsertMeta('meta[property="og:image"]', () => document.createElement("meta"), {
      property: "og:image",
      content: image,
    });
    upsertMeta('meta[property="og:site_name"]', () => document.createElement("meta"), {
      property: "og:site_name",
      content: "VELISQA",
    });
    upsertMeta('meta[property="og:locale"]', () => document.createElement("meta"), {
      property: "og:locale",
      content: "en_IN",
    });

    upsertMeta('meta[name="twitter:card"]', () => document.createElement("meta"), {
      name: "twitter:card",
      content: "summary_large_image",
    });
    upsertMeta('meta[name="twitter:title"]', () => document.createElement("meta"), {
      name: "twitter:title",
      content: title,
    });
    upsertMeta('meta[name="twitter:description"]', () => document.createElement("meta"), {
      name: "twitter:description",
      content: description,
    });
    upsertMeta('meta[name="twitter:image"]', () => document.createElement("meta"), {
      name: "twitter:image",
      content: image,
    });
    upsertMeta('meta[name="twitter:site"]', () => document.createElement("meta"), {
      name: "twitter:site",
      content: "@velisqa.in",
    });
    upsertMeta('meta[property="og:image:alt"]', () => document.createElement("meta"), {
      property: "og:image:alt",
      content: "Velisqa Jewellery logo",
    });
    upsertMeta('meta[name="author"]', () => document.createElement("meta"), {
      name: "author",
      content: "Velisqa Jewellery",
    });

    upsertJsonLd("velisqa-organization-schema", buildOrganizationSchema());
    upsertJsonLd("velisqa-website-schema", buildWebsiteSchema());

    if (schema.length) {
      upsertJsonLd("velisqa-page-schema", schema.length === 1 ? schema[0] : schema);
    } else {
      removeJsonLd("velisqa-page-schema");
    }
  }, [canonicalUrl, description, image, keywords, schema, title, type]);

  return null;
}
