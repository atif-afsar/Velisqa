import { NavLink, Link } from "react-router-dom";
import WhatsAppCTA from "./WhatsApp/WhatsAppCTA";

function Icon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

const links = [
  { label: "HOME", to: "/" },
  { label: "COLLECTIONS", to: "/collections" },
  { label: "ABOUT", to: "/about" },
  { label: "MODELS", to: "/models" },
  { label: "CONTACT", to: "/contact" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#847377]/10 bg-[#fdf9f4]/95 backdrop-blur-md">
      <div className="container-stitch flex items-center justify-between py-5">
        <Link to="/" className="font-serif text-4xl font-medium leading-none tracking-[0.02em] text-[#130006] transition-opacity hover:opacity-70 md:text-5xl">
          VELISQA
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => {
            return (
              <NavLink
                key={link.label}
                to={link.to}
                end={link.label === "HOME"}
                className={({ isActive }) =>
                  `type-label luxury-hover-text transition-colors duration-300 hover:text-[#130006] ${
                    isActive
                      ? "border-b-2 border-[#a0d1b8] pb-1 text-[#130006]"
                      : "text-[#514347]"
                  }`
                }
              >
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex items-center gap-6 text-[#130006]">
          <WhatsAppCTA className="hidden md:inline-flex px-4 py-2" intent="consult">Luxury Concierge</WhatsAppCTA>
          <button className="cursor-pointer transition-opacity active:opacity-70" aria-label="Account">
            <Icon>person</Icon>
          </button>
        </div>
      </div>
    </header>
  );
}
