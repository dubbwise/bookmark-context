import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Header from "./Header";

describe("Header", () => {
  it("renders logo text", () => {
    render(<Header onNewCollection={vi.fn()} onSettings={vi.fn()} />);
    expect(screen.getByText(/Bookmark Context/i)).toBeInTheDocument();
  });

  it("renders settings button", () => {
    render(<Header onNewCollection={vi.fn()} onSettings={vi.fn()} />);
    expect(screen.getByTitle(/settings/i)).toBeInTheDocument();
  });

  it("calls onNewCollection when + New button is clicked", () => {
    const onNewCollection = vi.fn();
    render(<Header onNewCollection={onNewCollection} onSettings={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /new/i }));
    expect(onNewCollection).toHaveBeenCalledOnce();
  });

  it("calls onSettings when settings button is clicked", () => {
    const onSettings = vi.fn();
    render(<Header onNewCollection={vi.fn()} onSettings={onSettings} />);
    fireEvent.click(screen.getByTitle(/settings/i));
    expect(onSettings).toHaveBeenCalledOnce();
  });
});
