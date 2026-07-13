// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import type { WorkspaceData } from "../domain/models";
import { loadCurrentWorkspace, saveCurrentWorkspace } from "./repository";

beforeEach(() => localStorage.clear());

describe("workspace snapshot repository", () => {
  it("saves and reloads the current local workspace snapshot", () => {
    const workspace: WorkspaceData = {
      project: {
        id: "project-1",
        title: "My Book",
        locale: "en-US",
        createdAt: "2026-07-12T00:00:00Z",
        updatedAt: "2026-07-12T00:00:00Z",
      },
      nodes: [
        { id: "book-1", projectId: "project-1", kind: "book", title: "My Book", position: 0, wordCount: 0, revision: 0, updatedAt: "2026-07-12T00:00:00Z" },
      ],
    };

    saveCurrentWorkspace(workspace);

    expect(loadCurrentWorkspace()).toEqual(workspace);
  });
});
