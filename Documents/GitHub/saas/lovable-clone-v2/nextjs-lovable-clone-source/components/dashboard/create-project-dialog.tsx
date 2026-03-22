/**
 * components/dashboard/create-project-dialog.tsx
 *
 * Dialog for creating a new project. Collects:
 * - Project name (required, min 1 character)
 * - AI model selection (dropdown with all supported models)
 * - Description (required — sent as the first AI prompt)
 *
 * On submit, calls the provided onSubmit callback with the form data.
 * The dialog is controlled via open/onOpenChange props from the parent.
 *
 * Used by: app/(app)/dashboard/page.tsx
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Available AI models for project generation.
 * Each entry has a machine-readable value and a human-readable label.
 */
const AI_MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gemini-2-flash", label: "Gemini 2.0 Flash" },
  { value: "gemini-2-pro", label: "Gemini 2.0 Pro" },
  { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
  { value: "claude-haiku-3-5", label: "Claude Haiku 3.5" },
  { value: "deepseek-v3", label: "DeepSeek V3" },
  { value: "deepseek-r1", label: "DeepSeek R1" },
] as const;

/**
 * Data submitted when the user creates a new project.
 */
export interface CreateProjectData {
  name: string;
  model: string;
  description: string;
}

/**
 * Props for the CreateProjectDialog component.
 *
 * @property open - Whether the dialog is currently visible
 * @property onOpenChange - Callback to toggle dialog visibility
 * @property onSubmit - Callback with form data when the user clicks "Create"
 */
export interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateProjectData) => void;
}

/**
 * CreateProjectDialog renders a modal form for creating a new project.
 * Validates that the project name is non-empty before allowing submission.
 */
export function CreateProjectDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateProjectDialogProps) {
  const [name, setName] = useState("");
  const [model, setModel] = useState<string>(AI_MODELS[0].value);
  const [description, setDescription] = useState("");

  /**
   * Handles form submission. Validates name, calls onSubmit, and resets form.
   */
  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) return;

    onSubmit({ name: trimmedName, model, description: description.trim() });

    // Reset form state after submission
    setName("");
    setModel(AI_MODELS[0].value);
    setDescription("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Give your project a name and describe what you want to build.
            Your description will be sent as the first AI prompt.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project name */}
          <div className="space-y-2">
            <label htmlFor="project-name" className="text-sm font-medium">
              Project Name
            </label>
            <Input
              id="project-name"
              placeholder="My awesome app"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </div>

          {/* AI model selection */}
          <div className="space-y-2">
            <label htmlFor="ai-model" className="text-sm font-medium">
              AI Model
            </label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="ai-model">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((aiModel) => (
                  <SelectItem key={aiModel.value} value={aiModel.value}>
                    {aiModel.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description — sent as the first AI prompt */}
          <div className="space-y-2">
            <label htmlFor="project-description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="project-description"
              placeholder="Describe the app you want to build, e.g. 'A todo app with categories and dark mode'"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || !description.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
