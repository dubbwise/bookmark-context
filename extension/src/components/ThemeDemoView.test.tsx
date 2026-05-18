import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ThemeDemoView from "./ThemeDemoView";

describe("ThemeDemoView", () => {
  beforeEach(() => {
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      getPropertyValue: (prop: string) =>
        prop === "--primary" ? "oklch(0.205 0 0)" : "oklch(0.5 0 0)",
    } as CSSStyleDeclaration);
  });

  it("renders title and representative token labels", () => {
    render(<ThemeDemoView onBack={vi.fn()} />);
    expect(screen.getByText("Theme demo")).toBeInTheDocument();
    expect(screen.getByText("Core")).toBeInTheDocument();
    expect(screen.getByText("primary")).toBeInTheDocument();
    expect(screen.getByText("destructive")).toBeInTheDocument();
    expect(screen.getByText("Components")).toBeInTheDocument();
    expect(screen.getAllByText(/oklch\(/).length).toBeGreaterThan(0);
  });

  it("calls onBack when back button is clicked", () => {
    const onBack = vi.fn();
    render(<ThemeDemoView onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
