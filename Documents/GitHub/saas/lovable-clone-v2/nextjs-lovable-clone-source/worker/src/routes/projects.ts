/**
 * worker/src/routes/projects.ts
 *
 * Hono router for project CRUD operations.
 * All routes are protected by auth middleware (applied in index.ts).
 *
 * Endpoints:
 * - GET    /api/projects      — List all projects for the authenticated user
 * - GET    /api/projects/:id  — Get a single project by ID (with ownership check)
 * - POST   /api/projects      — Create a new project (generates starter files)
 * - PATCH  /api/projects/:id  — Update project name or model
 * - DELETE /api/projects/:id  — Delete a project and all its files
 *
 * Data storage:
 * - KV `project:{id}` — Project metadata (name, model, timestamps)
 * - KV `user-projects:{userId}` — Array of project IDs for the user
 * - R2 `{projectId}/v{version}/files.json` — Version file snapshots
 *
 * Used by: worker/src/index.ts (mounted at /api/projects)
 */

import { Hono } from "hono";
import { nanoid } from "nanoid";
import type { Env, AppVariables } from "../types";
import type { Project } from "../types/project";
import { createInitialVersion } from "../ai/default-project";
import { getCredits, FREE_PROJECT_LIMIT } from "../services/credits";
import { sanitizeProjectName } from "../services/sanitize";

/**
 * Create a Hono router with typed bindings and variables.
 * The auth middleware sets `c.var.userId` before these handlers run.
 */
const projectRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// ---------------------------------------------------------------------------
// GET /api/projects — List all projects for the authenticated user
// ---------------------------------------------------------------------------

/**
 * Reads the user's project ID list from KV, then batch-fetches
 * each project's metadata. Returns projects sorted by most recently updated.
 */
projectRoutes.get("/", async (c) => {
  const userId = c.var.userId;

  // Read the user's project ID list from KV
  const projectIds = await c.env.METADATA.get<string[]>(
    `user-projects:${userId}`,
    "json"
  );

  if (!projectIds || projectIds.length === 0) {
    return c.json({ projects: [] });
  }

  // Batch-fetch all project metadata in parallel
  const projects = await Promise.all(
    projectIds.map((id) =>
      c.env.METADATA.get<Project>(`project:${id}`, "json")
    )
  );

  // Filter out any null results (deleted or corrupted) and sort by updatedAt
  const validProjects = projects
    .filter((project): project is Project => project !== null)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

  return c.json({ projects: validProjects });
});

// ---------------------------------------------------------------------------
// GET /api/projects/:id — Get a single project by ID
// ---------------------------------------------------------------------------

/**
 * Fetches a single project from KV and verifies the requesting user owns it.
 * Returns 404 if not found, 403 if owned by another user.
 */
projectRoutes.get("/:id", async (c) => {
  const userId = c.var.userId;
  const projectId = c.req.param("id");

  const project = await c.env.METADATA.get<Project>(
    `project:${projectId}`,
    "json"
  );

  if (!project) {
    return c.json({ error: "Project not found", code: "NOT_FOUND" }, 404);
  }

  if (project.userId !== userId) {
    return c.json({ error: "Access denied", code: "FORBIDDEN" }, 403);
  }

  return c.json({ project });
});

// ---------------------------------------------------------------------------
// POST /api/projects — Create a new project
// ---------------------------------------------------------------------------

/**
 * Creates a new project with:
 * 1. A unique nanoid
 * 2. Project metadata stored in KV
 * 3. The user's project ID list updated in KV
 * 4. Starter template files stored in R2 as version 0
 *
 * Request body: { name: string; model: string; description?: string }
 */
projectRoutes.post("/", async (c) => {
  const userId = c.var.userId;
  const body = await c.req.json<{
    name: string;
    model: string;
    description?: string;
  }>();

  // Validate and sanitize project name
  const sanitizedName = sanitizeProjectName(body.name || "");
  if (!sanitizedName) {
    return c.json(
      { error: "Project name is required", code: "VALIDATION_ERROR" },
      400
    );
  }

  // Check project count limit for free users
  const credits = await getCredits(userId, c.env);
  if (credits.plan === "free") {
    const existingIds = await c.env.METADATA.get<string[]>(
      `user-projects:${userId}`,
      "json"
    );
    const projectCount = existingIds?.length ?? 0;

    if (projectCount >= FREE_PROJECT_LIMIT) {
      return c.json(
        {
          error: `Free plan is limited to ${FREE_PROJECT_LIMIT} projects. Upgrade to Pro for unlimited projects.`,
          code: "PROJECT_LIMIT_REACHED",
          limit: FREE_PROJECT_LIMIT,
          current: projectCount,
        },
        403
      );
    }
  }

  const projectId = nanoid(12);
  const now = new Date().toISOString();

  // Create the project metadata
  const project: Project = {
    id: projectId,
    userId,
    name: sanitizedName,
    model: body.model || "gpt-4o-mini",
    currentVersion: 0,
    createdAt: now,
    updatedAt: now,
  };

  // Create the initial version with starter template files
  const initialVersion = createInitialVersion(project.name, project.model);

  // Store everything in parallel: KV metadata + R2 files + user index update
  const existingIds = await c.env.METADATA.get<string[]>(
    `user-projects:${userId}`,
    "json"
  );
  const updatedIds = [projectId, ...(existingIds ?? [])];

  await Promise.all([
    // Store project metadata in KV
    c.env.METADATA.put(`project:${projectId}`, JSON.stringify(project)),

    // Update the user's project list in KV
    c.env.METADATA.put(
      `user-projects:${userId}`,
      JSON.stringify(updatedIds)
    ),

    // Store initial version files in R2
    c.env.FILES.put(
      `${projectId}/v0/files.json`,
      JSON.stringify(initialVersion)
    ),
  ]);

  return c.json({ project }, 201);
});

// ---------------------------------------------------------------------------
// GET /api/projects/:id/files — Get current version files
// ---------------------------------------------------------------------------

/**
 * Fetches the files from the project's current version stored in R2.
 * Returns the Version object which includes the files array.
 * Used by the editor page to load project files into Sandpack and Monaco.
 */
projectRoutes.get("/:id/files", async (c) => {
  const userId = c.var.userId;
  const projectId = c.req.param("id");

  const project = await c.env.METADATA.get<Project>(
    `project:${projectId}`,
    "json"
  );

  if (!project) {
    return c.json({ error: "Project not found", code: "NOT_FOUND" }, 404);
  }

  if (project.userId !== userId) {
    return c.json({ error: "Access denied", code: "FORBIDDEN" }, 403);
  }

  // Read the current version files from R2
  const versionKey = `${projectId}/v${project.currentVersion}/files.json`;
  const versionObject = await c.env.FILES.get(versionKey);

  if (!versionObject) {
    return c.json(
      { error: "Version files not found", code: "NOT_FOUND" },
      404
    );
  }

  const version = (await versionObject.json()) as {
    files: Array<{ path: string; content: string }>;
  };

  return c.json({ files: version.files, version: project.currentVersion });
});

// ---------------------------------------------------------------------------
// PATCH /api/projects/:id — Update a project
// ---------------------------------------------------------------------------

/**
 * Updates a project's name and/or model.
 * Only the project owner can update it.
 *
 * Request body: { name?: string; model?: string }
 */
projectRoutes.patch("/:id", async (c) => {
  const userId = c.var.userId;
  const projectId = c.req.param("id");

  const project = await c.env.METADATA.get<Project>(
    `project:${projectId}`,
    "json"
  );

  if (!project) {
    return c.json({ error: "Project not found", code: "NOT_FOUND" }, 404);
  }

  if (project.userId !== userId) {
    return c.json({ error: "Access denied", code: "FORBIDDEN" }, 403);
  }

  const body = await c.req.json<{ name?: string; model?: string }>();

  // Apply updates
  if (body.name) {
    const sanitized = sanitizeProjectName(body.name);
    if (sanitized) project.name = sanitized;
  }
  if (body.model) {
    project.model = body.model;
  }
  project.updatedAt = new Date().toISOString();

  // Persist updated metadata
  await c.env.METADATA.put(`project:${projectId}`, JSON.stringify(project));

  return c.json({ project });
});

// ---------------------------------------------------------------------------
// DELETE /api/projects/:id — Delete a project
// ---------------------------------------------------------------------------

/**
 * Deletes a project by:
 * 1. Removing project metadata from KV
 * 2. Removing chat history from KV
 * 3. Removing the project ID from the user's project list
 * 4. Deleting all version files from R2
 *
 * Only the project owner can delete it.
 */
projectRoutes.delete("/:id", async (c) => {
  const userId = c.var.userId;
  const projectId = c.req.param("id");

  const project = await c.env.METADATA.get<Project>(
    `project:${projectId}`,
    "json"
  );

  if (!project) {
    return c.json({ error: "Project not found", code: "NOT_FOUND" }, 404);
  }

  if (project.userId !== userId) {
    return c.json({ error: "Access denied", code: "FORBIDDEN" }, 403);
  }

  // Remove project ID from the user's list
  const existingIds = await c.env.METADATA.get<string[]>(
    `user-projects:${userId}`,
    "json"
  );
  const updatedIds = (existingIds ?? []).filter((id) => id !== projectId);

  // Delete all R2 objects for this project (all versions)
  const r2Objects = await c.env.FILES.list({ prefix: `${projectId}/` });
  const deletePromises = r2Objects.objects.map((object) =>
    c.env.FILES.delete(object.key)
  );

  await Promise.all([
    // Delete project metadata from KV
    c.env.METADATA.delete(`project:${projectId}`),

    // Delete chat history from KV
    c.env.METADATA.delete(`chat:${projectId}`),

    // Update user's project list
    c.env.METADATA.put(
      `user-projects:${userId}`,
      JSON.stringify(updatedIds)
    ),

    // Delete all R2 files
    ...deletePromises,
  ]);

  return c.json({ success: true });
});

export { projectRoutes };
