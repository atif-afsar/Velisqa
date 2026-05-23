import { motion, useReducedMotion } from "framer-motion";
import { CREATOR_TIERS } from "./creatorTierData";

const EASE = [0.16, 1, 0.3, 1];

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: EASE },
  }),
};

export default function CreatorTierCards() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="tiers" className="container-stitch scroll-mt-28 py-20 md:py-28">
      <motion.div
        className="mx-auto mb-14 max-w-2xl text-center"
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <p className="mb-4 type-label text-[#d4af37]">Follower Tiers</p>
        <h2 className="type-section text-[#130006]">Rewards That Scale With You</h2>
        <p className="body-stitch mt-5 text-[#514347]">
          Your perks grow with your audience. Every tier unlocks complimentary pieces, deeper
          discounts, and exclusive campaign opportunities.
        </p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
      >
        {CREATOR_TIERS.map((tier, index) => (
          <motion.article
            key={tier.id}
            custom={index}
            variants={cardVariants}
            className={`group relative flex flex-col overflow-hidden rounded-2xl border p-6 transition-shadow duration-300 hover:shadow-[0_24px_48px_-12px_rgba(19,0,6,0.12)] ${
              tier.featured
                ? "border-[#d4af37]/40 bg-gradient-to-b from-[#fdf9f4] to-[#f7f3ee] shadow-[0_16px_40px_-12px_rgba(212,175,55,0.2)] lg:scale-[1.02]"
                : "border-[#130006]/8 bg-[#fdf9f4]"
            }`}
          >
            {tier.featured && (
              <span className="absolute right-4 top-4 rounded-full bg-[#d4af37]/15 px-2.5 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-[#3d0a21]">
                Popular
              </span>
            )}

            <motion.div
              className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-[#130006]"
              style={{ backgroundColor: `${tier.accent}33` }}
              whileHover={reduceMotion ? undefined : { scale: 1.08 }}
            >
              {tier.range.includes("M") ? "★" : tier.id.slice(0, 2).toUpperCase()}
            </motion.div>

            <h3 className="type-section text-lg text-[#130006]">{tier.name}</h3>
            <p className="mt-1 text-sm font-medium tracking-wide text-[#847377]">{tier.range} followers</p>

            <ul className="mt-6 flex flex-1 flex-col gap-3">
              {tier.perks.map((perk) => (
                <li key={perk} className="flex gap-2.5 text-[0.82rem] leading-snug text-[#514347]">
                  <span className="mt-0.5 shrink-0 text-[#d4af37]" aria-hidden="true">
                    ✦
                  </span>
                  {perk}
                </li>
              ))}
            </ul>

            <motion.div
              className="mt-6 h-0.5 w-full rounded-full opacity-40"
              style={{ background: `linear-gradient(90deg, transparent, ${tier.accent}, transparent)` }}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: EASE }}
            />
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
}
