import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Header from "./Header";

const defaultProps = {
  onNewCollection: vi.fn(),
  onSettings: vi.fn(),
  searchOpen: false,
  onSearchToggle: vi.fn(),
  showSearch: true,
};

describe("Header", () => {
  it("renders logo text", () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText(/Bookmark Context/i)).toBeInTheDocument();
  });

  it("renders settings button", () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByTitle(/settings/i)).toBeInTheDocument();
  });

  it("calls onNewCollection when New button is clicked", () => {
    const onNewCollection = vi.fn();
    render(<Header {...defaultProps} onNewCollection={onNewCollection} />);
    fireEvent.click(screen.getByRole("button", { name: /new/i }));
    expect(onNewCollection).toHaveBeenCalledOnce();
  });

  it("calls onSettings when settings button is clicked", () => {
    const onSettings = vi.fn();
    render(<Header {...defaultProps} onSettings={onSettings} />);
    fireEvent.click(screen.getByTitle(/settings/i));
    expect(onSettings).toHaveBeenCalledOnce();
  });

  it("calls onSearchToggle when search button is clicked", () => {
    const onSearchToggle = vi.fn();
    render(<Header {...defaultProps} onSearchToggle={onSearchToggle} />);
    fireEvent.click(screen.getByTitle(/search collections/i));
    expect(onSearchToggle).toHaveBeenCalledOnce();
  });

  it("hides search button when showSearch is false", () => {
    render(<Header {...defaultProps} showSearch={false} />);
    expect(screen.queryByTitle(/search collections/i)).not.toBeInTheDocument();
  });

  it("renders reload extension button", () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByTitle(/reload extension/i)).toBeInTheDocument();
  });

  it("calls chrome.runtime.reload when reload button is clicked", () => {
    const reload = vi.fn();
    vi.stubGlobal("chrome", { runtime: { reload } });
    render(<Header {...defaultProps} />);
    fireEvent.click(screen.getByTitle(/reload extension/i));
    expect(reload).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
