import ModelsHero from "./ModelsHero";
import CampaignModels from "./CampaignModels";
import ProductModels from "./ProductModels";

export default function ModelsContent() {
  return (
    <main className="page-offset-nav bg-[#fdf9f4] text-[#130006]">
      <ModelsHero />
      <CampaignModels />
      <ProductModels />
    </main>
  );
}
