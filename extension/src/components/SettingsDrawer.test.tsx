import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SettingsDrawer from "./SettingsDrawer";

const mockGet = vi.fn();
const mockSet = vi.fn();

vi.stubGlobal("chrome", {
  storage: { sync: { get: mockGet, set: mockSet } },
});

describe("SettingsDrawer", () => {
  beforeEach(() => {
    mockGet.mockResolvedValue({ daemonPort: 7331, theme: "dark" });
    mockSet.mockResolvedValue(undefined);
    document.documentElement.classList.remove("dark");
  });

  it("reads daemonPort and theme from storage when opened", async () => {
    render(<SettingsDrawer open={true} onOpenChange={vi.fn()} />);
    await act(async () => {});
    expect(mockGet).toHaveBeenCalledWith({ daemonPort: 7331, theme: "dark" });
  });

  it("displays the port value from storage", async () => {
    mockGet.mockResolvedValue({ daemonPort: 8080, theme: "dark" });
    render(<SettingsDrawer open={true} onOpenChange={vi.fn()} />);
    await act(async () => {});
    expect(screen.getByLabelText(/daemon port/i)).toHaveValue(8080);
  });

  it("defaults to 7331 and dark when storage has no values", async () => {
    mockGet.mockResolvedValue({});
    render(<SettingsDrawer open={true} onOpenChange={vi.fn()} />);
    await act(async () => {});
    expect(screen.getByLabelText(/daemon port/i)).toHaveValue(7331);
    expect(screen.getByLabelText(/light/i)).not.toBeChecked();
    expect(screen.getByLabelText(/dark/i)).toBeChecked();
  });

  it("selects light theme from storage", async () => {
    mockGet.mockResolvedValue({ daemonPort: 7331, theme: "light" });
    render(<SettingsDrawer open={true} onOpenChange={vi.fn()} />);
    await act(async () => {});
    expect(screen.getByLabelText(/light/i)).toBeChecked();
  });

  it("saves port and theme to storage when Save is clicked", async () => {
    mockGet.mockResolvedValue({ daemonPort: 7331, theme: "dark" });
    render(<SettingsDrawer open={true} onOpenChange={vi.fn()} />);
    await act(async () => {});
    const input = screen.getByLabelText(/daemon port/i);
    await userEvent.clear(input);
    await userEvent.type(input, "9000");
    await userEvent.click(screen.getByLabelText(/system/i));
    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: /save/i }));
    });
    expect(mockSet).toHaveBeenCalledWith({ daemonPort: 9000, theme: "system" });
  });

  it("applies light theme after saving", async () => {
    mockGet.mockResolvedValue({ daemonPort: 7331, theme: "dark" });
    render(<SettingsDrawer open={true} onOpenChange={vi.fn()} />);
    await act(async () => {});
    await userEvent.click(screen.getByLabelText(/light/i));
    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: /save/i }));
    });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("shows Saved ✓ after saving", async () => {
    render(<SettingsDrawer open={true} onOpenChange={vi.fn()} />);
    await act(async () => {});
    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: /save/i }));
    });
    expect(screen.getByRole("button", { name: /saved/i })).toBeInTheDocument();
  });
});
