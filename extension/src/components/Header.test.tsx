import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Header from "./Header";

describe("Header", () => {
  it("renders logo text", () => {
    render(<Header onNewCollection={vi.fn()} />);
    expect(screen.getByText(/Bookmark Context/i)).toBeInTheDocument();
  });

  it("renders settings link", () => {
    render(<Header onNewCollection={vi.fn()} />);
    expect(screen.getByTitle(/settings/i)).toBeInTheDocument();
  });
});
