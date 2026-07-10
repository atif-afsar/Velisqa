import bracelet from "../../assets/Bracelet/IMG_3445.webp";
import pendant from "../../assets/Necklace/IMG_3430.webp";
import earrings from "../../assets/Earrings/image.webp";
import rings from "../../assets/Rings/image.webp";
import seasonalBracelet from "../../assets/Bracelet/image1.webp";
import seasonalRing from "../../assets/Rings/image1.webp";
import seasonalEarrings from "../../assets/Earrings/IMG_3463.webp";
import seasonalHero from "../../assets/hero/image8.webp";

export const icons = [
  { name: "Aurelia Knot", type: "Bracelet", image: bracelet, startingAt: 440 },
  { name: "Luna Pendant", type: "Necklace", image: pendant, startingAt: 499 },
  { name: "Veridia Hoops", type: "Earrings", image: earrings, startingAt: 297 },
  { name: "Eterna Stack", type: "Rings", image: rings, startingAt: 399 },
];

export const values = [
  ["female", "Modern Femininity", "Redefining classic silhouettes for the bold, independent woman of today."],
  ["public", "Authentic Origin", "Every finish and stone accent is chosen for lustre, comfort, and lasting wear — crafted as premium artificial jewellery."],
  ["auto_fix_high", "Handcrafted Artistry", "Master artisans spend hundreds of hours on each singular VELISQA creation."],
];

export const seasonal = [
  ["Radiance Horizon", seasonalBracelet],
  ["Solaris Bloom", seasonalRing],
  ["Aurora Drops", seasonalEarrings],
  ["Sunlit Silhouette", seasonalHero],
];
