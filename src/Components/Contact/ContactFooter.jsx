import Icon from "./Icon";

export default function ContactFooter() {
  return (
    <footer className="mt-20 bg-[#3d0a21] pb-28 pt-12 text-[#b97189] md:mt-32 md:pb-12">
      <div className="container-stitch flex flex-col items-center justify-between gap-8 text-center md:flex-row md:text-left">
        <div>
          <div className="mb-4 font-serif text-3xl text-[#b97189]">VELISQA</div>
          <p className="max-w-xs text-sm leading-7 opacity-80">Crafting heritage into every diamond. The pinnacle of Indian luxury jewellery.</p>
        </div>
        <p className="text-center text-sm opacity-80">Copyright 2026 VELISQA JEWELLERY. Established in India. Newly Launched - 2026.</p>
        <div className="flex gap-8">
          <Icon>description</Icon>
          <Icon>photo_camera</Icon>
          <Icon>auto_awesome</Icon>
        </div>
      </div>
    </footer>
  );
}
