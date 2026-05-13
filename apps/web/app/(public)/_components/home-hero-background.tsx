import type { CSSProperties } from "react"
import { CatIcon, PawPrintIcon } from "lucide-react"

function floatStyle(rotate: string) {
  return { "--home-float-rotate": rotate } as CSSProperties
}

function HomeHeroBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="home-hero-gradient-wash absolute inset-[-18%] motion-reduce:animate-none" />
      <div className="home-hero-top-glow absolute inset-x-[-10%] top-[-18%] h-[58%] motion-reduce:animate-none" />
      <CatIcon
        className="home-float-slow absolute top-[14%] right-[8%] size-24 text-brand-teal/12 sm:size-32"
        style={floatStyle("6deg")}
      />
      <CatIcon
        className="home-float-reverse absolute bottom-[10%] left-[7%] size-20 text-brand-coral/10 sm:size-28"
        style={floatStyle("-12deg")}
      />
      <PawPrintIcon
        className="home-float-medium absolute top-[20%] left-[12%] size-10 text-brand-amber/20 sm:size-12"
        style={floatStyle("-12deg")}
      />
      <PawPrintIcon
        className="home-float-slow absolute top-[42%] left-[3%] size-8 text-brand-teal/12 sm:size-10"
        style={floatStyle("12deg")}
      />
      <PawPrintIcon
        className="home-float-reverse absolute top-[33%] right-[20%] size-9 text-brand-olive/18 sm:size-11"
        style={floatStyle("12deg")}
      />
      <PawPrintIcon
        className="home-float-medium absolute right-[9%] bottom-[20%] size-10 text-brand-coral/12 sm:size-12"
        style={floatStyle("-6deg")}
      />
      <PawPrintIcon
        className="home-float-slow absolute bottom-[7%] left-[50%] hidden size-8 text-brand-teal-strong/14 sm:block"
        style={floatStyle("12deg")}
      />
    </div>
  )
}

export { HomeHeroBackground }
