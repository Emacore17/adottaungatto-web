"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

import { cn } from "@workspace/ui/lib/utils"

type RevealProps = {
  children: ReactNode
  className?: string
  delay?: number
  as?: "div" | "section" | "li" | "span"
}

function Reveal({ children, className, delay = 0, as = "div" }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const node = ref.current

    if (!node) {
      return
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = window.requestAnimationFrame(() => {
        setShown(true)
      })

      return () => {
        window.cancelAnimationFrame(frame)
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true)
            observer.disconnect()
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    )

    observer.observe(node)

    // Il contenuto non deve mai restare nascosto se l'observer non scatta
    // (tab in background, renderer headless, browser senza supporto).
    const fallback = window.setTimeout(() => {
      setShown(true)
      observer.disconnect()
    }, 1200)

    return () => {
      window.clearTimeout(fallback)
      observer.disconnect()
    }
  }, [])

  const Tag = as

  return (
    <Tag
      ref={ref as never}
      className={cn(shown ? "reveal-shown" : "reveal-hidden", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}

export { Reveal }
