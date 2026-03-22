/**
 * components/landing/hero.tsx
 *
 * Hero section matching Lovable's landing page design.
 * Features:
 * - Full-viewport mesh gradient background (blue → purple → pink)
 * - Announcement badge: "New · Introducing a smarter experience →"
 * - Large white headline: "Build something Lovable"
 * - Subtitle: "Create apps and websites by chatting with AI"
 * - Large dark chat input card with:
 *   - Textarea-style placeholder
 *   - Bottom bar: "+" icon, "Plan" button, submit arrow
 * - The CTA links to /sign-up since generation requires auth
 *
 * Used by: app/(marketing)/page.tsx
 */

import Link from "next/link";
import { Plus, ArrowUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Hero renders the main landing section with the gradient background,
 * headline, and the signature dark chat input card.
 */
export function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6">
      {/* Mesh gradient background — blue/purple/pink flowing gradients */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Base gradient layer */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0533] via-[#0f0a2e] to-[#1c1c1c]" />

        {/* Blue blob — top center */}
        <div className="absolute -top-[20%] left-1/2 h-[70%] w-[80%] -translate-x-1/2 rounded-full bg-[#3b47d6] opacity-40 blur-[120px]" />

        {/* Purple blob — center */}
        <div className="absolute top-[10%] left-[20%] h-[50%] w-[60%] rounded-full bg-[#6b3fa0] opacity-30 blur-[120px]" />

        {/* Pink/magenta blob — bottom left */}
        <div className="absolute bottom-[0%] left-[5%] h-[60%] w-[50%] rounded-full bg-[#d63384] opacity-30 blur-[120px]" />

        {/* Pink blob — bottom right */}
        <div className="absolute bottom-[5%] right-[10%] h-[50%] w-[45%] rounded-full bg-[#e84393] opacity-25 blur-[120px]" />

        {/* Hot pink accent — bottom center */}
        <div className="absolute bottom-[10%] left-1/2 h-[40%] w-[40%] -translate-x-1/2 rounded-full bg-[#ff006e] opacity-20 blur-[100px]" />
      </div>

      {/* Content — centered on top of gradient */}
      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center">
        {/* Announcement badge */}
        <Link href="/sign-up" className="group mb-8">
          <Badge
            variant="secondary"
            className="gap-2 border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/80 backdrop-blur-sm transition-colors duration-150 hover:bg-white/10"
          >
            <span className="rounded bg-[#6d5acd] px-1.5 py-0.5 text-xs font-semibold text-white">
              New
            </span>
            Introducing a smarter experience
            <span className="transition-transform duration-150 group-hover:translate-x-0.5">
              &rarr;
            </span>
          </Badge>
        </Link>

        {/* Headline */}
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
          Build something Lovable
        </h1>

        {/* Subtitle */}
        <p className="mt-4 text-lg text-white/60">
          Create apps and websites by chatting with AI
        </p>

        {/* Chat input card — large dark card matching Lovable's design */}
        <div className="mt-10 w-full">
          <Link href="/sign-up" className="block">
            <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#1c1c1c]/90 shadow-2xl backdrop-blur-md transition-all duration-150 hover:border-white/15">
              {/* Textarea area */}
              <div className="px-5 pb-2 pt-5">
                <p className="text-left text-[15px] text-white/40">
                  Ask Lovable Clone to create a landing page for my...
                </p>
              </div>

              {/* Bottom bar with actions */}
              <div className="flex items-center justify-between px-5 pb-4 pt-6">
                {/* Left: attachment icon */}
                <div className="flex items-center">
                  <div className="flex size-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:text-white/60">
                    <Plus className="size-5" />
                  </div>
                </div>

                {/* Right: Plan button + submit */}
                <div className="flex items-center gap-2">
                  <div className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-white/70">
                    Plan
                  </div>
                  <div className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white/50">
                    <ArrowUp className="size-4" />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
