import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SyncStatusBadge } from "@/app/components/sync-status-badge";

const mockUseCoachAuth = vi.fn();
vi.mock("@/app/hooks/use-coach-auth", () => ({
  useCoachAuth: () => mockUseCoachAuth(),
}));

const mockBackend = vi.fn();
vi.mock("@/lib/checkin-store", () => ({
  createCheckinStore: () => ({ backend: mockBackend() }),
}));

const signedInUser = { uid: "user-1", email: "me@example.com" };

describe("SyncStatusBadge", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows guest local mode when Firebase auth is unconfigured", () => {
    mockUseCoachAuth.mockReturnValue({ authUser: null, authConfigured: false });
    mockBackend.mockReturnValue("local");

    render(<SyncStatusBadge />);

    expect(screen.getByText("GUEST (LOCAL)")).toBeTruthy();
  });

  it("shows cloud synced only when signed in and the store backend is firestore", () => {
    mockUseCoachAuth.mockReturnValue({ authUser: signedInUser, authConfigured: true });
    mockBackend.mockReturnValue("firestore");

    render(<SyncStatusBadge />);

    expect(screen.getByText("CLOUD SYNCED")).toBeTruthy();
  });

  it("shows sync off when firestore mode is configured but unavailable", () => {
    mockUseCoachAuth.mockReturnValue({ authUser: signedInUser, authConfigured: true });
    mockBackend.mockReturnValue("firestore-fallback");

    render(<SyncStatusBadge />);

    expect(screen.getByText("SYNC OFF (LOCAL)")).toBeTruthy();
    expect(screen.queryByText("CLOUD SYNCED")).toBeNull();
  });

  it("shows signed-in local mode when the deployment uses the local backend", () => {
    mockUseCoachAuth.mockReturnValue({ authUser: signedInUser, authConfigured: true });
    mockBackend.mockReturnValue("local");

    render(<SyncStatusBadge />);

    expect(screen.getByText("SIGNED IN (LOCAL)")).toBeTruthy();
    expect(screen.queryByText("CLOUD SYNCED")).toBeNull();
  });

  it("shows local workspace when signed out with auth configured", () => {
    mockUseCoachAuth.mockReturnValue({ authUser: null, authConfigured: true });
    mockBackend.mockReturnValue("local");

    render(<SyncStatusBadge />);

    expect(screen.getByText("LOCAL WORKSPACE")).toBeTruthy();
  });
});
