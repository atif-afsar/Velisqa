import CreatorHero from "./CreatorHero";
import CreatorPerks from "./CreatorPerks";
import CreatorRegistrationForm from "./CreatorRegistrationForm";
import CreatorTierCards from "./CreatorTierCards";

export default function ModelsContent() {
  return (
    <main className="page-offset-nav bg-[#fdf9f4] text-[#130006]">
      <CreatorHero />
      <CreatorTierCards />
      <CreatorPerks />
      <CreatorRegistrationForm />
    </main>
  );
}
