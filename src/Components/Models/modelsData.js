import modelPortrait from "../../assets/image4.webp";
import collectionHero from "../../assets/hero/image.webp";
import velvetService from "../../assets/contact-velvet-service.webp";
import boutique from "../../assets/contact-boutique.webp";
import craftsmanship from "../../assets/velisqa-craftsmanship.webp";
import aethelgard from "../../assets/collection-aethelgard-earrings.webp";
import solitaire from "../../assets/collection-solitaire-pendant.webp";
import bangle from "../../assets/collection-obsidian-bangle.webp";
import brooch from "../../assets/collection-lumina-brooch.webp";
import ruby from "../../assets/collection-ruby-sovereign.webp";
import tiara from "../../assets/collection-azure-tiara.webp";
import pearls from "../../assets/collection-celestial-pearls.webp";
import solarisNecklace from "../../assets/velisqa-solaris-necklace.webp";
import solarisRing from "../../assets/velisqa-solaris-ring.webp";
import solarisEarrings from "../../assets/velisqa-solaris-earrings.webp";

export const editorialModels = [
  {
    title: "Founder Portrait",
    type: "Editorial Model",
    image: modelPortrait,
    className: "md:col-span-2 md:row-span-2",
  },
  {
    title: "Architectural Opulence",
    type: "Campaign Scene",
    image: collectionHero,
  },
  {
    title: "Velvet Service",
    type: "Atelier Scene",
    image: velvetService,
  },
  {
    title: "Boutique Facade",
    type: "Retail Model",
    image: boutique,
  },
  {
    title: "Craftsmanship Study",
    type: "Process Model",
    image: craftsmanship,
  },
];

export const productModels = [
  ["Aethelgard Earrings", "High Jewellery", aethelgard],
  ["Solitaire Pendant", "Necklace Model", solitaire],
  ["Obsidian Bangle", "Sculptural Form", bangle],
  ["Lumina Brooch", "Archive Piece", brooch],
  ["Ruby Sovereign", "Vault Treasure", ruby],
  ["Azure Tiara", "Heritage Piece", tiara],
  ["Celestial Pearls", "Limited Launch", pearls],
  ["Solaris Bloom", "Seasonal Edit", solarisNecklace],
  ["Golden Horizon", "Seasonal Edit", solarisRing],
  ["Aurora Drops", "Seasonal Edit", solarisEarrings],
];
