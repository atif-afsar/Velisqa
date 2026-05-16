export default function ProductCaption({ name, price, large = false }) {
  return (
    <div className={`${large ? "mt-6" : "mt-4"} text-center`}>
      <p className={`font-serif text-[#130006] ${large ? "text-3xl leading-[1.3]" : "text-2xl"}`}>{name}</p>
      <p className="text-base leading-[1.6] text-[#514347]">{price}</p>
    </div>
  );
}
