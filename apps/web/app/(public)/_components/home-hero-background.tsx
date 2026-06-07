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
      <div className="absolute inset-[-18%] motion-reduce:animate-none" />
      <div className="absolute inset-x-[-10%] top-[-18%] h-[58%] motion-reduce:animate-none" />
      <CatIcon
        className="absolute top-[14%] right-[8%] size-24 text-foreground/12 sm:size-32"
        style={floatStyle("6deg")}
      />
      <CatIcon
        className="absolute bottom-[10%] left-[7%] size-20 text-accent/10 sm:size-28"
        style={floatStyle("-12deg")}
      />
      <PawPrintIcon
        className="absolute top-[20%] left-[12%] size-10 text-amber-700/20 sm:size-12"
        style={floatStyle("-12deg")}
      />
      <PawPrintIcon
        className="absolute top-[42%] left-[3%] size-8 text-foreground/12 sm:size-10"
        style={floatStyle("12deg")}
      />
      <PawPrintIcon
        className="absolute top-[33%] right-[20%] size-9 text-emerald-700/18 sm:size-11"
        style={floatStyle("12deg")}
      />
      <PawPrintIcon
        className="absolute right-[9%] bottom-[20%] size-10 text-accent/12 sm:size-12"
        style={floatStyle("-6deg")}
      />
      <PawPrintIcon
        className="absolute bottom-[7%] left-[50%] hidden size-8 text-foreground/14 sm:block"
        style={floatStyle("12deg")}
      />
    </div>
  )
}

export { HomeHeroBackground }
