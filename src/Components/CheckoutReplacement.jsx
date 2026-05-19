import BuyNowButton from "./WhatsApp/BuyNowButton";
import TrustBadge from "./TrustBadge";

export default function CheckoutReplacement({ productName, productUrl }) {
  return (
    <section className="container-stitch my-12 rounded-lg bg-gradient-to-r from-[#1b0b12] via-[#2e141f] to-[#3d0a21] p-8 text-white shadow-2xl">
      <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
        <div className="max-w-xl text-center md:text-left">
          <h4 className="font-serif text-2xl font-medium">Private Purchase Assistance</h4>
          <p className="mt-2 text-sm text-[#ffe088]/90">To maintain our white-glove service, purchases are completed via our private concierge on WhatsApp.</p>
        </div>

        <div className="flex flex-col items-center gap-3 md:flex-row">
          <BuyNowButton productName={productName} productUrl={productUrl} className="px-8 py-3">
            Buy Now
          </BuyNowButton>
          <div className="flex gap-3">
            <TrustBadge text="Direct Brand Support" />
            <TrustBadge text="Secure Manual Verification" />
          </div>
        </div>
      </div>
    </section>
  );
}
