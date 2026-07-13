// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../App";

afterEach(cleanup);
describe("on-demand inspector workspaces", () => {
  it("keeps the editor immediate and loads specialist analysis on selection", async () => {
    render(<App/>);
    fireEvent.click(screen.getByRole("button", { name: /Story Architecture/ }));
    fireEvent.click(screen.getByRole("button", { name: "Analysis" }));
    expect(await screen.findByText("Pacing Engine")).toBeVisible();
  });
});
