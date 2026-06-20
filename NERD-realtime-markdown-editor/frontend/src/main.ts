// Client entry point. For now it renders the textarea content into the preview
// pane on every input; real-time sync over Socket.IO is wired up in a later step.
import { renderMarkdown } from "./markdown";

const textarea = document.getElementById("markdown-input") as HTMLTextAreaElement;
const preview = document.getElementById("preview") as HTMLElement;

function updatePreview(): void {
  preview.innerHTML = renderMarkdown(textarea.value);
}

textarea.addEventListener("input", updatePreview);

// Initial paint (handles any pre-filled content).
updatePreview();
