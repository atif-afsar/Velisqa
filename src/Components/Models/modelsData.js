import modelPortrait from "../../assets/velisqa-model.png";
import collectionHero from "../../assets/collection-hero.png";
import velvetService from "../../assets/contact-velvet-service.png";
import boutique from "../../assets/contact-boutique.png";
import craftsmanship from "../../assets/velisqa-craftsmanship.png";
import aethelgard from "../../assets/collection-aethelgard-earrings.png";
import solitaire from "../../assets/collection-solitaire-pendant.png";
import bangle from "../../assets/collection-obsidian-bangle.png";
import brooch from "../../assets/collection-lumina-brooch.png";
import ruby from "../../assets/collection-ruby-sovereign.png";
import tiara from "../../assets/collection-azure-tiara.png";
import pearls from "../../assets/collection-celestial-pearls.png";
import solarisNecklace from "../../assets/velisqa-solaris-necklace.png";
import solarisRing from "../../assets/velisqa-solaris-ring.png";
import solarisEarrings from "../../assets/velisqa-solaris-earrings.png";

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
