// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImportExportPanel } from "./ImportExportPanel";

afterEach(cleanup);

describe("publishing export workspace", () => {
  it("explains the KDP paperback preset before export", () => {
    render(<ImportExportPanel projectTitle="The Wake" onImported={vi.fn()}/>);
    fireEvent.change(screen.getByLabelText("Export format"), { target: { value: "kdp-docx" } });
    expect(screen.getByRole("note")).toHaveTextContent("6 × 9 inch trim");
    expect(screen.getByRole("note")).toHaveTextContent("KDP Previewer");
    expect(screen.getByRole("button", { name: "Export KDP-ready DOCX" })).toBeEnabled();
  });
});
