import type { CSSProperties } from "react"
import { CatIcon, PawPrintIcon } from "lucide-react"

function floatStyle(rotate: string) {
  return { "--home-float-rotate": rotate } as CSSProperties
}

function HomeHeroBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <CatIcon
        className="home-float-slow absolute top-[14%] right-[8%] size-24 text-primary/12 sm:size-32"
        style={floatStyle("6deg")}
      />
      <CatIcon
        className="home-float-reverse absolute bottom-[10%] left-[7%] size-20 text-primary/10 sm:size-28"
        style={floatStyle("-12deg")}
      />
      <PawPrintIcon
        className="home-float-medium absolute top-[20%] left-[12%] size-10 text-muted-foreground/18 sm:size-12"
        style={floatStyle("-12deg")}
      />
      <PawPrintIcon
        className="home-float-slow absolute top-[42%] left-[3%] size-8 text-primary/12 sm:size-10"
        style={floatStyle("12deg")}
      />
      <PawPrintIcon
        className="home-float-reverse absolute top-[33%] right-[20%] size-9 text-muted-foreground/16 sm:size-11"
        style={floatStyle("12deg")}
      />
      <PawPrintIcon
        className="home-float-medium absolute right-[9%] bottom-[20%] size-10 text-primary/12 sm:size-12"
        style={floatStyle("-6deg")}
      />
      <PawPrintIcon
        className="home-float-slow absolute bottom-[7%] left-[50%] hidden size-8 text-muted-foreground/14 sm:block"
        style={floatStyle("12deg")}
      />
    </div>
  )
}

export { HomeHeroBackground }
