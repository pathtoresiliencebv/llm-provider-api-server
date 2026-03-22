/**
 * components/editor/preview-panel.tsx
 *
 * Live preview panel using Sandpack (CodeSandbox's browser-based bundler).
 * Renders the project files as a running React application inside an iframe.
 *
 * Configuration:
 * - Template: react-ts (React + TypeScript)
 * - Theme: dark (matching the app's dark-first design)
 * - External resources: Tailwind CDN for utility-class styling
 * - Shows navigator (URL bar) for SPA routing
 *
 * File Format:
 * Sandpack expects files in the format: { "/App.tsx": { code: "..." } }
 * Our state uses: { "src/App.tsx": "..." }
 * This component transforms between these formats.
 *
 * This component is lazy-loaded with next/dynamic({ ssr: false })
 * because Sandpack requires browser APIs (iframes, web workers).
 *
 * Used by: app/(app)/project/[projectId]/page.tsx (via dynamic import)
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  SandpackProvider,
  SandpackPreview,
  SandpackLayout,
  useSandpack,
} from "@codesandbox/sandpack-react";

/**
 * Props for the PreviewPanel component.
 *
 * @property files - Record of file paths to content strings (e.g., "src/App.tsx": "...")
 */
export interface PreviewPanelProps {
  files: Record<string, string>;
  onError?: (error: { message: string }) => void;
}

/**
 * Extracts dependencies from the project's package.json file.
 * When the AI adds packages like lucide-react or recharts to package.json,
 * Sandpack needs those in its customSetup.dependencies to install them.
 *
 * Falls back to base React dependencies if package.json is missing or invalid.
 *
 * @param files - Our file record with paths as keys and content as values
 * @returns Dependency record mapping package names to version strings
 */
function extractDependencies(
  files: Record<string, string>
): Record<string, string> {
  const baseDeps: Record<string, string> = {
    react: "^18.2.0",
    "react-dom": "^18.2.0",
  };

  const packageJsonContent = files["package.json"];
  if (!packageJsonContent) return baseDeps;

  try {
    const parsed = JSON.parse(packageJsonContent);
    return { ...baseDeps, ...(parsed.dependencies || {}) };
  } catch {
    return baseDeps;
  }
}

/**
 * Transforms our file format into Sandpack's expected format.
 * Our state uses paths like "src/App.tsx" but Sandpack expects "/App.tsx".
 *
 * For React-ts template, Sandpack expects:
 * - /App.tsx as the main component
 * - /index.tsx as the entry point (or uses its own)
 *
 * @param files - Our file record with "src/" prefixed paths
 * @returns Sandpack-compatible file record with "/" prefixed paths
 */
function toSandpackFiles(
  files: Record<string, string>
): Record<string, { code: string }> {
  const sandpackFiles: Record<string, { code: string }> = {};

  for (const [path, content] of Object.entries(files)) {
    // Strip the "src/" prefix for Sandpack, as it uses /App.tsx, /index.tsx etc.
    // Keep other paths (like package.json) as-is but with leading /
    const sandpackPath = path.startsWith("src/")
      ? `/${path.slice(4)}`
      : `/${path}`;

    sandpackFiles[sandpackPath] = { code: content };
  }

  return sandpackFiles;
}

/**
 * Listens for Sandpack build/runtime errors via the message bus.
 * Must be rendered inside SandpackProvider to access the useSandpack hook.
 * Uses a 1.5s debounce to let Sandpack settle (avoids transient bundling errors)
 * and deduplicates consecutive identical error messages.
 *
 * @param onError - Callback fired with the error message after debounce
 */
function ErrorListener({ onError }: { onError: (error: { message: string }) => void }) {
  const { sandpack, listen } = useSandpack();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastErrorRef = useRef<string>("");

  const handleError = useCallback(
    (message: string) => {
      // Dedup: skip if same error message as last reported
      if (message === lastErrorRef.current) return;

      // Clear existing debounce timer
      if (debounceRef.current) clearTimeout(debounceRef.current);

      // Wait 1.5s for Sandpack to settle before reporting
      debounceRef.current = setTimeout(() => {
        lastErrorRef.current = message;
        onError({ message });
      }, 1500);
    },
    [onError]
  );

  /**
   * Watch the sandpack.error state for bundler/compile errors.
   * These include dependency resolution failures ("Could not find dependency")
   * and syntax errors that Sandpack surfaces via its error overlay.
   * The message listener below does NOT catch these — they only appear in state.
   */
  useEffect(() => {
    if (sandpack.error?.message) {
      handleError(sandpack.error.message);
    }
  }, [sandpack.error, handleError]);

  /**
   * Listen to the message bus for runtime errors (console.error)
   * and action-based errors that some Sandpack versions emit.
   */
  useEffect(() => {
    const unsubscribe = listen((msg) => {
      // Cast to unknown first to safely access additional properties
      const raw = msg as unknown as Record<string, unknown>;

      // Detect "show-error" action messages (build errors)
      if (msg.type === "action" && raw.action === "show-error") {
        const errorMessage =
          (raw.message as string) ||
          (raw.title as string) ||
          "Build error";
        handleError(errorMessage);
      }

      // Detect console.error messages (runtime errors)
      if (msg.type === "console" && raw.log) {
        const logs = raw.log as Array<{ method?: string; data?: string[] }>;
        for (const log of Array.isArray(logs) ? logs : [logs]) {
          if (log.method === "error" && log.data && log.data.length > 0) {
            handleError(log.data.join(" "));
            break;
          }
        }
      }
    });

    return () => {
      unsubscribe();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [listen, handleError]);

  return null;
}

/**
 * "Built with Lovable" badge shown in the Sandpack preview actions bar.
 * Uses inline styles instead of Tailwind because Sandpack's CSS-in-JS
 * (stitches) applies scoped styles with high specificity that override
 * Tailwind utility classes. React state drives the hover effect.
 */
function LovableBadge() {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href="/"
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        borderRadius: 6,
        padding: "4px 8px",
        fontSize: 12,
        cursor: "pointer",
        textDecoration: "none",
        transition: "all 150ms ease",
        color: hovered ? "#ffffff" : "#808080",
        backgroundColor: hovered ? "rgba(255,255,255,0.08)" : "transparent",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.15)" : "transparent"}`,
      }}
    >
      <img src="/logo.svg" alt="" style={{ width: 14, height: 14 }} />
      Built with Lovable
    </a>
  );
}

/**
 * PreviewPanel renders the project as a live React app using Sandpack.
 * The preview updates automatically when the files prop changes.
 *
 * @param files - Current project files to render in the preview
 */
export function PreviewPanel({ files, onError }: PreviewPanelProps) {
  const sandpackFiles = toSandpackFiles(files);
  const dependencies = extractDependencies(files);

  return (
    <div className="sandpack-stretch h-full w-full">
      <SandpackProvider
        template="react-ts"
        theme="dark"
        files={sandpackFiles}
        options={{
          externalResources: ["https://cdn.tailwindcss.com"],
        }}
        customSetup={{
          dependencies,
        }}
      >
        {/* Listen for build/runtime errors when an onError handler is provided */}
        {onError && <ErrorListener onError={onError} />}

        <SandpackLayout
          style={{
            height: "100%",
            border: "none",
            borderRadius: 0,
          }}
        >
          <SandpackPreview
            showNavigator
            showRefreshButton
            showOpenInCodeSandbox={false}
            actionsChildren={<LovableBadge />}
            style={{ height: "100%" }}
          />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}
