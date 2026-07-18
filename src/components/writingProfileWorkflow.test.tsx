// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsPanel } from "./SettingsPanel";
import { saveProjectCover } from "../lib/settingsRepository";

vi.mock("../lib/settingsRepository", () => ({
  listProjectBackups: vi.fn().mockResolvedValue([]), createProjectBackup: vi.fn(),
  restoreProjectBackupCopy: vi.fn(), verifyProjectBackup: vi.fn(), saveProjectCover:vi.fn(),
}));

beforeEach(() => {localStorage.clear();vi.clearAllMocks()}); afterEach(cleanup);

describe("author voice project profile", () => {
  it("persists structured preferences as a new local version", async () => {
    render(<SettingsPanel projectId="project-1" projectRoot="/tmp/novel.lillith"/>);
    const summary = await screen.findByLabelText("Authorial voice summary");
    fireEvent.change(summary, { target: { value: "Precise maritime gothic with restrained emotion." } });
    fireEvent.change(screen.getByLabelText(/Always preserve/), { target: { value: "Technical precision\nAmbiguous emotion" } });
    fireEvent.change(screen.getByLabelText(/Project rules/), { target: { value: "Do not identify the signal early" } });
    fireEvent.click(screen.getByRole("button", { name: "Save new profile version" }));
    await waitFor(() => expect(screen.getByText(/Author Voice version 1 saved locally/)).toBeVisible());
    const saved = JSON.parse(localStorage.getItem("lillith:writing-profile:v1") || "{}");
    expect(saved.preserve).toEqual(["Technical precision", "Ambiguous emotion"]); expect(saved.version).toBe(1);
  });
  it("removes an existing project cover and reports the refreshed project",async()=>{const changed=vi.fn();vi.mocked(saveProjectCover).mockResolvedValue({id:"project-1",title:"Novel",locale:"en-US",createdAt:"2026-07-16",updatedAt:"2026-07-16"});render(<SettingsPanel projectId="project-1" projectTitle="Novel" coverImageDataUrl="data:image/png;base64,aGVsbG8=" onProjectChanged={changed}/>);fireEvent.click(screen.getByRole("button",{name:"Project Identity"}));fireEvent.click(screen.getByRole("button",{name:"Remove cover"}));await waitFor(()=>expect(saveProjectCover).toHaveBeenCalledWith(undefined));expect(changed).toHaveBeenCalledWith(expect.objectContaining({id:"project-1"}));});
});
