import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import StatusBar from "./StatusBar";

describe("StatusBar", () => {
  it("shows 'Daemon offline' when offline", () => {
    render(<StatusBar online={false} backend="" />);
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });

  it("shows backend name when online", () => {
    render(<StatusBar online={true} backend="0.1.0" />);
    expect(screen.getByText(/0\.1\.0/)).toBeInTheDocument();
  });
});
