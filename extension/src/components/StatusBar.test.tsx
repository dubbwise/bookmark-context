import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import StatusBar from "./StatusBar";

describe("StatusBar", () => {
  const defaultProps = {
    online: true as const,
    backend: "0.1.0",
    onOpenThemeDemo: vi.fn(),
  };

  it("shows 'Daemon offline' when offline", () => {
    render(<StatusBar {...defaultProps} online={false} backend="" />);
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });

  it("shows backend name when online", () => {
    render(<StatusBar {...defaultProps} />);
    expect(screen.getByText(/0\.1\.0/)).toBeInTheDocument();
  });

  it("calls onOpenThemeDemo when theme demo button is clicked", () => {
    const onOpenThemeDemo = vi.fn();
    render(<StatusBar {...defaultProps} onOpenThemeDemo={onOpenThemeDemo} />);
    fireEvent.click(screen.getByTitle(/theme demo/i));
    expect(onOpenThemeDemo).toHaveBeenCalledOnce();
  });
});
