/**
 * components/dashboard/project-card.tsx
 *
 * Renders a single project card in the dashboard grid.
 * Shows a live Sandpack preview thumbnail (scaled down), project name,
 * relative time since last edit, and a dropdown menu for actions
 * (rename, duplicate, delete).
 *
 * The preview is rendered at 1024×640 then CSS-scaled to fit the
 * thumbnail area. It's non-interactive (pointer-events: none).
 * Falls back to a gradient with initials if files aren't loaded yet.
 *
 * Clicking the card navigates to /project/{projectId} for editing.
 * The dropdown menu stops click propagation so actions don't trigger navigation.
 *
 * Used by: components/dashboard/project-grid.tsx
 */

"use client";

import { useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { Project } from "@/types/project";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Dynamically import ProjectPreview with ssr: false.
 * Sandpack requires browser APIs and should only load on the client.
 */
const ProjectPreview = dynamic(
  () =>
    import("./project-preview").then((mod) => ({
      default: mod.ProjectPreview,
    })),
  { ssr: false }
);

/**
 * Virtual width the preview renders at before scaling.
 * Must match the value in project-preview.tsx.
 */
const VIRTUAL_WIDTH = 1024;

/**
 * Fixed height for the thumbnail area in pixels.
 * The scaled preview is clipped to this height, showing
 * just the top portion of the app — like a screenshot.
 */
const THUMBNAIL_HEIGHT = 160;

/**
 * Props for the ProjectCard component.
 *
 * @property project - The project data to display
 * @property files - Project files for the live preview (undefined = still loading)
 * @property onRename - Callback when "Rename" is selected from the dropdown
 * @property onDelete - Callback when "Delete" is selected from the dropdown
 */
export interface ProjectCardProps {
  project: Project;
  files?: Record<string, string>;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Computes a relative time string like "2 hours ago" from an ISO date.
 * Uses the built-in Intl.RelativeTimeFormat for localized output.
 *
 * @param dateString - ISO 8601 date string to compute relative time from
 * @returns A human-readable relative time string
 */
function getRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffInSeconds = Math.floor((now - then) / 1000);

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  for (const [unit, secondsInUnit] of units) {
    if (diffInSeconds >= secondsInUnit) {
      const value = Math.floor(diffInSeconds / secondsInUnit);
      return formatter.format(-value, unit);
    }
  }

  return "just now";
}

/**
 * Extracts initials from a project name for the fallback thumbnail.
 * Takes the first letter of the first two words (e.g., "My App" → "MA").
 *
 * @param name - The project name to extract initials from
 * @returns 1-2 character initial string
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * ProjectCard displays a single project as a clickable card with
 * a live Sandpack preview thumbnail, name, update time, and action dropdown.
 * Falls back to a gradient with initials while files are loading.
 */
export function ProjectCard({
  project,
  files,
  onRename,
  onDelete,
}: ProjectCardProps) {
  const router = useRouter();
  const initials = getInitials(project.name);
  const thumbnailRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const hasFiles = files && Object.keys(files).length > 0;

  /**
   * Whether the Sandpack preview has finished loading.
   * Controls the skeleton overlay at card resolution.
   */
  const [previewReady, setPreviewReady] = useState(false);

  /**
   * Compute the CSS scale factor so the 1024px-wide virtual preview
   * fits inside the card's thumbnail container.
   */
  useEffect(() => {
    if (!thumbnailRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const containerWidth = entry.contentRect.width;
        setScale(containerWidth / VIRTUAL_WIDTH);
      }
    });

    observer.observe(thumbnailRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div onClick={() => router.push(`/project/${project.id}`)}>
      <Card className="group cursor-pointer gap-0 overflow-hidden p-0 transition-all duration-150 hover:border-white/20 hover:brightness-[1.05]">
        {/* Preview thumbnail — fixed height, clipped. Live Sandpack or gradient fallback. */}
        <div
          ref={thumbnailRef}
          className={cn(
            "relative overflow-hidden",
            hasFiles
              ? "bg-[#1a1a1a]"
              : "bg-gradient-to-br from-[#6d9cff]/20 via-[#c084fc]/20 to-[#f87171]/20"
          )}
          style={{ height: THUMBNAIL_HEIGHT }}
        >
          {hasFiles && scale > 0 ? (
            <>
              {/* Scaled Sandpack preview */}
              <div
                className="absolute inset-0 origin-top-left"
                style={{ transform: `scale(${scale})` }}
              >
                <ProjectPreview
                  files={files}
                  onLoad={() => setPreviewReady(true)}
                />
              </div>

              {/*
               * Interaction blocker — sits above the iframe at z-20.
               * pointer-events-none on the parent div doesn't reliably block
               * iframe interaction because iframes have their own browsing
               * context. This transparent overlay absorbs all pointer events
               * so the card click (navigation) works instead.
               */}
              <div className="absolute inset-0 z-20" />

              {/* Skeleton overlay at card resolution — fades out when preview is ready */}
              <div
                className={cn(
                  "absolute inset-0 z-10 transition-opacity duration-500",
                  previewReady ? "pointer-events-none opacity-0" : "opacity-100"
                )}
              >
                <div className="h-full w-full animate-pulse bg-[#1a1a1a] p-3">
                  <div className="h-2.5 w-full rounded bg-white/5" />
                  <div className="mt-3 h-12 w-3/4 rounded bg-white/5" />
                  <div className="mt-3 space-y-2">
                    <div className="h-2 w-full rounded bg-white/[0.03]" />
                    <div className="h-2 w-5/6 rounded bg-white/[0.03]" />
                    <div className="h-2 w-4/6 rounded bg-white/[0.03]" />
                  </div>
                </div>
              </div>
            </>
          ) : files === undefined ? (
            /* Files still fetching — skeleton shimmer */
            <Skeleton className="absolute inset-0 rounded-none" />
          ) : (
            /* Fallback — gradient with initials (files is empty object) */
            <div className="flex h-full items-center justify-center">
              <span className="text-2xl font-bold text-muted-foreground/60">
                {initials}
              </span>
            </div>
          )}
        </div>

        {/* Project info + action dropdown */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{project.name}</p>
            <p className="text-xs text-muted-foreground">
              {getRelativeTime(project.updatedAt)}
            </p>
          </div>

          {/* Dropdown menu — stops click propagation to prevent navigation */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="opacity-0 group-hover:opacity-100"
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
              <DropdownMenuItem onClick={() => onRename(project.id)}>
                <Pencil className="mr-2 size-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(project.id)}
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>
    </div>
  );
}
