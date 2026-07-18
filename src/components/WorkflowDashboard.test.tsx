// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkflowDashboard } from "./WorkflowDashboard";
import { createBlankWorkflowState } from "../domain/workflow";
import type { ManuscriptNode, Project } from "../domain/models";

const project:Project={id:"project-1",title:"The Wake",locale:"en-CA",createdAt:"2026-01-01",updatedAt:"2026-01-01"};
const nodes:ManuscriptNode[]=[{id:"scene-1",projectId:project.id,kind:"scene",title:"Opening",position:0,wordCount:0,revision:0,updatedAt:"2026-01-01",content:"<p></p>"}];
const props=(workflow=createBlankWorkflowState(project))=>({project,nodes,characters:[],workflow,onNavigateWorkspace:vi.fn(),onAdvancePhase:vi.fn(),onWorkflowChange:vi.fn()});
afterEach(cleanup);

describe("visual project workflow",()=>{
  it("shows the seven story-level stages",()=>{
    render(<WorkflowDashboard {...props()}/>);
    expect(screen.getByRole("region",{name:"Novel workflow"})).toBeVisible();
    for(const name of ["Idea","Story Development","Manuscript","Revisions","Production","Publishing","Marketing"]){
      expect(screen.getByRole("button",{name:new RegExp(name,"i")})).toBeVisible();
    }
  });

  it("opens Story Development directly from its stage",()=>{
    const values=props();
    render(<WorkflowDashboard {...values}/>);
    fireEvent.click(screen.getByRole("button",{name:/Story Development/i}));
    expect(values.onNavigateWorkspace).toHaveBeenCalledWith("manuscript");
  });

  it("opens Manuscript directly from its stage",()=>{
    const values=props();
    render(<WorkflowDashboard {...values}/>);
    fireEvent.click(screen.getByRole("button",{name:/Manuscript Ready/i}));
    expect(values.onNavigateWorkspace).toHaveBeenCalledWith("manuscript");
  });
});
