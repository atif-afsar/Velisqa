export const legalPages = {
  privacy: {
    path: "/privacy",
    title: "Privacy Policy",
    eyebrow: "Your Trust",
    description:
      "How VELISQA collects, protects, and respects your personal information across our salon, website, and concierge services.",
    updated: "May 2026",
    sections: [
      {
        id: "overview",
        title: "Overview",
        body: [
          "VELISQA Jewellery (“we”, “our”, “us”) is committed to safeguarding the privacy of every client, visitor, and member of The Inner Circle. This policy explains what information we collect, why we collect it, and the choices available to you.",
        ],
      },
      {
        id: "collection",
        title: "Information We Collect",
        body: [
          "We may collect your name, email address, phone number, appointment preferences, purchase history, and styling notes when you enquire, book a consultation, or subscribe to our editorial list.",
          "When you browse our website, we may collect technical data such as device type, browser, and anonymised usage patterns to improve performance and content relevance.",
        ],
      },
      {
        id: "use",
        title: "How We Use Your Information",
        body: [
          "Your details help us respond to enquiries, fulfil orders, arrange private viewings, and share curated updates you have opted into.",
          "We do not sell your personal data. We share information only with trusted partners who assist with payments, delivery, or salon operations—and only where necessary.",
        ],
      },
      {
        id: "rights",
        title: "Your Rights",
        body: [
          "You may request access, correction, or deletion of your personal data by contacting our concierge team at velisqa.in@gmail.com.",
          "You may unsubscribe from marketing communications at any time using the link in our emails or by writing to us directly.",
        ],
      },
      {
        id: "contact",
        title: "Contact",
        body: [
          "For privacy-related questions, please email velisqa.in@gmail.com or visit our flagship salon at Palladium Mall, Lower Parel, Mumbai.",
        ],
      },
    ],
  },
  terms: {
    path: "/terms",
    title: "Terms of Service",
    eyebrow: "Our Promise",
    description:
      "The terms governing your use of the VELISQA website, concierge services, and purchases from our collections.",
    updated: "May 2026",
    sections: [
      {
        id: "agreement",
        title: "Agreement",
        body: [
          "By accessing velisqa.com or engaging our services, you agree to these Terms of Service. If you do not agree, please discontinue use of our website and services.",
        ],
      },
      {
        id: "products",
        title: "Products & Pricing",
        body: [
          "VELISQA offers luxury artificial and fashion jewellery. Product imagery is styled to reflect true colour and finish; minor variations may occur due to lighting or screen settings.",
          "Prices are displayed on request or confirmed at the time of purchase. We reserve the right to amend pricing, availability, or specifications without prior notice.",
        ],
      },
      {
        id: "orders",
        title: "Orders & Appointments",
        body: [
          "Orders and bespoke commissions are confirmed only upon written acceptance and agreed payment terms. Appointments at our Mumbai salon are subject to availability.",
          "Cancellations or rescheduling should be communicated at least twenty-four hours in advance where possible.",
        ],
      },
      {
        id: "liability",
        title: "Limitation of Liability",
        body: [
          "To the fullest extent permitted by law, VELISQA shall not be liable for indirect or consequential loss arising from use of our website or products, beyond remedies available under applicable consumer protection laws.",
        ],
      },
      {
        id: "law",
        title: "Governing Law",
        body: [
          "These terms are governed by the laws of India. Disputes shall be subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra.",
        ],
      },
    ],
  },
  authenticity: {
    path: "/authenticity",
    title: "Authenticity & Craft",
    eyebrow: "The VELISQA Standard",
    description:
      "Our commitment to material integrity, artisan finishing, and transparent communication about every piece we create.",
    updated: "May 2026",
    sections: [
      {
        id: "philosophy",
        title: "Our Philosophy",
        body: [
          "VELISQA creates premium artificial jewellery designed for modern luxury. We celebrate craftsmanship, thoughtful design, and the confidence that comes from wearing pieces finished to an exceptional standard.",
        ],
      },
      {
        id: "materials",
        title: "Materials & Finishing",
        body: [
          "Each piece is composed of carefully selected base metals, stones, and platings chosen for wearability, lustre, and longevity. Finishes are inspected at multiple stages before a piece leaves our atelier.",
          "Product descriptions indicate composition and care guidance. Our concierge team is available to answer detailed questions before you purchase.",
        ],
      },
      {
        id: "care",
        title: "Care & Longevity",
        body: [
          "To preserve brilliance, store pieces separately, avoid contact with perfumes and moisture, and clean gently with a soft cloth. Bespoke care cards accompany signature collections.",
        ],
      },
      {
        id: "certificate",
        title: "Certificate of Origin",
        body: [
          "Selected signature pieces include a VELISQA certificate detailing collection name, finish, and date of completion. Certificates support insurance, gifting, and resale documentation where applicable.",
        ],
      },
      {
        id: "concierge",
        title: "Concierge Verification",
        body: [
          "For authentication support on past purchases, contact our concierge with your order reference or salon receipt. We maintain records for pieces acquired through official VELISQA channels.",
        ],
      },
    ],
  },
};

export const legalNav = [
  { key: "privacy", label: "Privacy", path: legalPages.privacy.path },
  { key: "terms", label: "Terms", path: legalPages.terms.path },
  { key: "authenticity", label: "Authenticity", path: legalPages.authenticity.path },
];
