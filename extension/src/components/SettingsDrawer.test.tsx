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
    mockGet.mockResolvedValue({ daemonPort: 7331 });
    mockSet.mockResolvedValue(undefined);
  });

  it("reads daemonPort from storage when opened", async () => {
    render(<SettingsDrawer open={true} onOpenChange={vi.fn()} />);
    await act(async () => {});
    expect(mockGet).toHaveBeenCalledWith("daemonPort");
  });

  it("displays the port value from storage", async () => {
    mockGet.mockResolvedValue({ daemonPort: 8080 });
    render(<SettingsDrawer open={true} onOpenChange={vi.fn()} />);
    await act(async () => {});
    expect(screen.getByLabelText(/daemon port/i)).toHaveValue(8080);
  });

  it("defaults to 7331 when storage has no value", async () => {
    mockGet.mockResolvedValue({});
    render(<SettingsDrawer open={true} onOpenChange={vi.fn()} />);
    await act(async () => {});
    expect(screen.getByLabelText(/daemon port/i)).toHaveValue(7331);
  });

  it("saves port to storage when Save is clicked", async () => {
    mockGet.mockResolvedValue({ daemonPort: 7331 });
    render(<SettingsDrawer open={true} onOpenChange={vi.fn()} />);
    await act(async () => {});
    const input = screen.getByLabelText(/daemon port/i);
    await userEvent.clear(input);
    await userEvent.type(input, "9000");
    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: /save/i }));
    });
    expect(mockSet).toHaveBeenCalledWith({ daemonPort: 9000 });
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
