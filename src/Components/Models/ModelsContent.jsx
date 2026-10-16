import CreatorHero from "./CreatorHero";
import CreatorPerks from "./CreatorPerks";
import CreatorRegistrationForm from "./CreatorRegistrationForm";
import CreatorTierCards from "./CreatorTierCards";

export default function ModelsContent() {
  return (
    <main className="page-offset-nav bg-paper text-ink">
      <CreatorHero />
      <CreatorTierCards />
      <CreatorPerks />
      <CreatorRegistrationForm />
    </main>
  );
}
