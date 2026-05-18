import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import NewCollectionDialog from "./NewCollectionDialog";
import EditCollectionDialog from "./EditCollectionDialog";
import DeleteCollectionDialog from "./DeleteCollectionDialog";
import ScanWarningDialog from "./ScanWarningDialog";
import type { Collection, ScanWarning } from "../../types";

vi.mock("../../api", () => ({
  api: {
    createCollection: vi.fn().mockResolvedValue({ id: "new", name: "My Coll", description: "", created_at: "", updated_at: "", bookmark_count: 0 }),
    updateCollection: vi.fn().mockResolvedValue({ id: "c1", name: "Renamed", description: "", created_at: "", updated_at: "", bookmark_count: 2 }),
    deleteCollection: vi.fn().mockResolvedValue(null),
  },
}));

const coll: Collection = { id: "c1", name: "Research", description: "desc", created_at: "", updated_at: "", bookmark_count: 5 };

describe("NewCollectionDialog", () => {
  it("renders when open", () => {
    render(<NewCollectionDialog open={true} onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.getByPlaceholderText(/collection name/i)).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<NewCollectionDialog open={false} onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.queryByPlaceholderText(/collection name/i)).not.toBeInTheDocument();
  });

  it("calls onCreated after creating", async () => {
    const { api } = await import("../../api");
    const onCreated = vi.fn();
    render(<NewCollectionDialog open={true} onOpenChange={vi.fn()} onCreated={onCreated} />);
    await userEvent.type(screen.getByPlaceholderText(/collection name/i), "My Coll");
    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: /create/i }));
    });
    expect(api.createCollection).toHaveBeenCalledWith("My Coll", "");
    expect(onCreated).toHaveBeenCalled();
  });
});

describe("EditCollectionDialog", () => {
  it("pre-fills the collection name", () => {
    render(<EditCollectionDialog open={true} collection={coll} onOpenChange={vi.fn()} onEdited={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByDisplayValue("Research")).toBeInTheDocument();
  });
});

describe("DeleteCollectionDialog", () => {
  it("shows bookmark count and requires collection name to delete", async () => {
    const user = userEvent.setup();
    render(<DeleteCollectionDialog open={true} collection={coll} onOpenChange={vi.fn()} onDeleted={vi.fn()} />);
    expect(screen.getByText(/5/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeDisabled();
    await user.type(screen.getByPlaceholderText("Research"), "Research");
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeEnabled();
  });
});

describe("ScanWarningDialog", () => {
  const warning: ScanWarning = { status: "scan_warning", risk_score: 0.85, signals: ["xss"], matches: ["<script>alert(1)</script>"] };

  it("shows risk score", () => {
    render(<ScanWarningDialog open={true} warning={warning} onDiscard={vi.fn()} onForce={vi.fn()} />);
    expect(screen.getByText(/0.85/)).toBeInTheDocument();
  });
});
