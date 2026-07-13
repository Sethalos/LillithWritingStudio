// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorPane } from "./EditorPane";
import type { ManuscriptNode } from "../domain/models";

const node: ManuscriptNode = { id:"scene", projectId:"project", parentId:"chapter", kind:"scene", title:"Test Scene", position:0, wordCount:3, content:"<p>salt and salt</p>", revision:0, updatedAt:new Date().toISOString() };
afterEach(() => { cleanup(); localStorage.clear(); });

describe("manuscript editor workflows", () => {
  it("replaces all text matches through ProseMirror ranges", () => {
    const change=vi.fn();
    render(<EditorPane document={node} content="<p>salt and salt</p>" characters={[]} onChange={change} onAi={vi.fn()} onComment={vi.fn()} onMetadata={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button",{name:"Find and replace"}));
    fireEvent.change(screen.getByLabelText("Find"),{target:{value:"salt"}});
    expect(screen.getByText("1 of 2")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Replace"),{target:{value:"brine"}});
    fireEvent.click(screen.getByRole("button",{name:"Replace all"}));
    expect(change).toHaveBeenLastCalledWith("<p>brine and brine</p>");
  });

  it("submits persistent scene metadata", async () => {
    const metadata=vi.fn().mockResolvedValue(undefined);
    render(<EditorPane document={node} content="<p>text</p>" characters={[]} onChange={vi.fn()} onAi={vi.fn()} onComment={vi.fn()} onMetadata={metadata}/>);
    fireEvent.click(screen.getByRole("button",{name:"Scene details"}));
    fireEvent.change(screen.getByPlaceholderText("What must change in this scene?"),{target:{value:"Raise the stakes"}});
    fireEvent.change(screen.getByPlaceholderText("horror, reveal, low tide"),{target:{value:"horror, reveal"}});
    fireEvent.click(screen.getByRole("button",{name:"Save details"}));
    await waitFor(()=>expect(metadata).toHaveBeenCalledWith({sceneGoal:"Raise the stakes",wordGoal:undefined,tags:["horror","reveal"],povCharacterId:undefined,sceneType:"mixed",sceneLocation:undefined}));
  });

  it("hydrates scene location from the local Story Bible", async () => {
    const metadata=vi.fn().mockResolvedValue(undefined);
    localStorage.setItem("lillith:story-bible",JSON.stringify([{id:"loc-1",projectId:"project",entityType:"location",name:"Greyhaven Observatory",summary:"A drowned coastal observatory",canonStatus:"canon",facts:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}]));
    render(<EditorPane document={node} content="<p>text</p>" characters={[]} onChange={vi.fn()} onAi={vi.fn()} onComment={vi.fn()} onMetadata={metadata}/>);
    fireEvent.click(screen.getByRole("button",{name:"Scene details"}));
    await waitFor(()=>expect(screen.getByText("Story Bible location")).toBeVisible());
    fireEvent.change(screen.getByDisplayValue("Custom / not linked"),{target:{value:"loc-1"}});
    expect(screen.getByPlaceholderText("Greyhaven Observatory, south stair")).toHaveValue("Greyhaven Observatory");
  });
});
