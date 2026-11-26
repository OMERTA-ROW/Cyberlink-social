import { describe, expect, it } from "vitest";
import AppErrorBoundary from "./AppErrorBoundary";

describe("application crash recovery", () => {
  it("moves a crashed application into a recovery state", () => {
    expect(AppErrorBoundary.getDerivedStateFromError()).toEqual({ failed: true });
  });

  it("does not replace healthy pages", () => {
    const boundary = new AppErrorBoundary({ children: "healthy page" });
    expect(boundary.state.failed).toBe(false);
    expect(boundary.render()).toBe("healthy page");
  });
});