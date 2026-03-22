/**
 * components/dashboard/project-preview.tsx
 *
 * Miniature live preview of a project using Sandpack.
 * Renders the project files as a running React app inside a scaled-down
 * iframe. Non-interactive (pointer-events disabled) — purely visual.
 *
 * Calls onLoad when the Sandpack bundler finishes and the iframe
 * has rendered, so the parent can manage its own loading UI.
 *
 * The preview is rendered at 1024px width then CSS-scaled down to fit
 * the card thumbnail area, giving a realistic desktop-sized preview
 * in a small space.
 *
 * This component must be dynamically imported with { ssr: false }
 * because Sandpack requires browser APIs (iframes, web workers).
 *
 * Used by: components/dashboard/project-card.tsx (via dynamic import)
 */

"use client";

import { useEffect } from "react";
import {
  SandpackProvider,
  SandpackPreview,
  SandpackLayout,
  useSandpack,
} from "@codesandbox/sandpack-react";

/**
 * Props for the ProjectPreview component.
 *
 * @property files - Record of file paths to content (e.g., "src/App.tsx": "...")
 * @property onLoad - Called when the Sandpack iframe has finished rendering
 */
export interface ProjectPreviewProps {
  files: Record<string, string>;
  onLoad?: () => void;
}

/**
 * Width of the virtual viewport the preview renders at before scaling.
 * 1024px gives a realistic desktop preview.
 */
const VIRTUAL_WIDTH = 1024;
const VIRTUAL_HEIGHT = 640;

/**
 * Transforms our file format into Sandpack's expected format.
 * Strips "src/" prefix — Sandpack expects "/App.tsx", not "/src/App.tsx".
 */
function toSandpackFiles(
  files: Record<string, string>
): Record<string, { code: string }> {
  const sandpackFiles: Record<string, { code: string }> = {};

  for (const [path, content] of Object.entries(files)) {
    const sandpackPath = path.startsWith("src/")
      ? `/${path.slice(4)}`
      : `/${path}`;
    sandpackFiles[sandpackPath] = { code: content };
  }

  return sandpackFiles;
}

/**
 * Extracts dependencies from the project's package.json.
 * Falls back to base React deps if package.json is missing or invalid.
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
 * Inner component that listens for the Sandpack "done" message.
 * Must be inside a SandpackProvider to use the useSandpack hook.
 * Calls onLoad once the bundler finishes and the iframe has rendered.
 */
function LoadNotifier({ onLoad }: { onLoad?: () => void }) {
  const { listen } = useSandpack();

  useEffect(() => {
    if (!onLoad) return;

    const unsubscribe = listen((message) => {
      if (message.type === "done") {
        onLoad();
      }
    });
    return unsubscribe;
  }, [listen, onLoad]);

  return null;
}

/**
 * ProjectPreview renders a miniature, non-interactive Sandpack preview.
 * The preview renders at VIRTUAL_WIDTH then the parent container
 * scales it down with CSS transform to fit the card.
 *
 * @param files - Project files to render
 * @param onLoad - Called when the preview iframe has finished loading
 */
export function ProjectPreview({ files, onLoad }: ProjectPreviewProps) {
  const sandpackFiles = toSandpackFiles(files);
  const dependencies = extractDependencies(files);

  return (
    <div
      className="origin-top-left"
      style={{
        width: VIRTUAL_WIDTH,
        height: VIRTUAL_HEIGHT,
      }}
    >
      {/* Inner wrapper gets sandpack-stretch to force Sandpack to fill 100%.
          Kept separate from the outer div so the !important width/height
          doesn't override the explicit virtual viewport dimensions. */}
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
          <LoadNotifier onLoad={onLoad} />
          <SandpackLayout
            style={{
              height: "100%",
              border: "none",
              borderRadius: 0,
            }}
          >
            <SandpackPreview
              showNavigator={false}
              showRefreshButton={false}
              showOpenInCodeSandbox={false}
              style={{ height: "100%" }}
            />
          </SandpackLayout>
        </SandpackProvider>
      </div>
    </div>
  );
}
