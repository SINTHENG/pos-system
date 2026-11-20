"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StaffMember, StaffShift } from "@/types";

export const DEFAULT_STAFF: StaffMember[] = [
  {
    id: "staff_1",
    name: "Staff 1",
    email: "staff1@pos.example",
    role: "CASHIER",
    color: "indigo",
  },
  {
    id: "staff_2",
    name: "Staff 2",
    email: "staff2@pos.example",
    role: "CASHIER",
    color: "emerald",
  },
];

const INITIAL_SHIFTS: StaffShift[] = [
  {
    id: "shift_101",
    staffId: "staff_1",
    staffName: "Staff 1",
    openedAt: "2026-11-19T08:00:00.000Z",
    closedAt: "2026-11-19T14:00:00.000Z",
    status: "CLOSED",
    startingCash: 100,
    endingCash: 385.5,
    notes: "Morning shift - completed smoothly",
    totalSales: 285.5,
    totalOrders: 18,
  },
  {
    id: "shift_102",
    staffId: "staff_2",
    staffName: "Staff 2",
    openedAt: "2026-11-19T14:00:00.000Z",
    closedAt: "2026-11-19T21:00:00.000Z",
    status: "CLOSED",
    startingCash: 100,
    endingCash: 442.2,
    notes: "Evening shift - high volume",
    totalSales: 342.2,
    totalOrders: 22,
  },
  {
    id: "shift_103",
    staffId: "staff_1",
    staffName: "Staff 1",
    openedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    closedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    status: "CLOSED",
    startingCash: 100,
    endingCash: 310.0,
    notes: "Completed morning shift today",
    totalSales: 210.0,
    totalOrders: 14,
  },
  {
    id: "shift_104",
    staffId: "staff_2",
    staffName: "Staff 2",
    openedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    status: "OPEN",
    startingCash: 100,
    endingCash: 0,
    notes: "Currently active on POS",
    totalSales: 94.5,
    totalOrders: 6,
  },
];

interface ShiftState {
  staffMembers: StaffMember[];
  activeShift: StaffShift | null;
  shifts: StaffShift[];

  // Actions
  openShift: (
    staffId: string,
    startingCash?: number,
    notes?: string
  ) => { ok: boolean; error?: string; shift?: StaffShift };

  closeShift: (
    endingCash?: number,
    notes?: string,
    finalTotals?: { totalSales?: number; totalOrders?: number }
  ) => { ok: boolean; error?: string; shift?: StaffShift };

  recordOrderToShift: (orderTotal: number) => void;
  getStaffMember: (staffId: string) => StaffMember | undefined;
}

export const useShiftStore = create<ShiftState>()(
  persist(
    (set, get) => ({
      staffMembers: DEFAULT_STAFF,
      activeShift: INITIAL_SHIFTS.find((s) => s.status === "OPEN") ?? null,
      shifts: INITIAL_SHIFTS,

      openShift: (staffId, startingCash = 100, notes = "") => {
        const { activeShift, shifts } = get();
        const staffList = get().staffMembers?.length ? get().staffMembers : DEFAULT_STAFF;

        // Enforce rule: only one active shift at a time
        if (activeShift && activeShift.status === "OPEN") {
          return {
            ok: false,
            error: `Shift is already active for ${activeShift.staffName}. Please close it first.`,
          };
        }

        const staff = staffList.find((s) => s.id === staffId);
        if (!staff) {
          return { ok: false, error: "Invalid staff member selected." };
        }

        const newShift: StaffShift = {
          id: `shift_${Date.now()}`,
          staffId: staff.id,
          staffName: staff.name,
          openedAt: new Date().toISOString(),
          status: "OPEN",
          startingCash,
          endingCash: 0,
          notes,
          totalSales: 0,
          totalOrders: 0,
        };

        set({
          activeShift: newShift,
          shifts: [newShift, ...shifts],
          staffMembers: staffList,
        });

        return { ok: true, shift: newShift };
      },

      closeShift: (endingCash, notes, finalTotals) => {
        const { activeShift, shifts } = get();

        if (!activeShift) {
          return { ok: false, error: "No active shift to close." };
        }

        const closedShift: StaffShift = {
          ...activeShift,
          closedAt: new Date().toISOString(),
          status: "CLOSED",
          endingCash: endingCash !== undefined ? endingCash : (activeShift.startingCash ?? 0),
          notes: notes !== undefined && notes !== "" ? notes : activeShift.notes,
          totalSales: finalTotals?.totalSales !== undefined ? finalTotals.totalSales : activeShift.totalSales,
          totalOrders: finalTotals?.totalOrders !== undefined ? finalTotals.totalOrders : activeShift.totalOrders,
        };

        const updatedShifts = shifts.map((s) =>
          s.id === closedShift.id ? closedShift : s
        );

        set({
          activeShift: null,
          shifts: updatedShifts,
        });

        return { ok: true, shift: closedShift };
      },

      recordOrderToShift: (orderTotal: number) => {
        const { activeShift, shifts } = get();
        if (!activeShift) return;

        const updatedActive: StaffShift = {
          ...activeShift,
          totalOrders: (activeShift.totalOrders ?? 0) + 1,
          totalSales: +((activeShift.totalSales ?? 0) + orderTotal).toFixed(2),
        };

        const updatedShifts = shifts.map((s) =>
          s.id === updatedActive.id ? updatedActive : s
        );

        set({
          activeShift: updatedActive,
          shifts: updatedShifts,
        });
      },

      getStaffMember: (staffId: string) => {
        const list = get().staffMembers?.length ? get().staffMembers : DEFAULT_STAFF;
        return list.find((s) => s.id === staffId);
      },
    }),
    {
      name: "pos-staff-shifts",
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Guarantee both Staff 1 and Staff 2 exist
          const members = state.staffMembers || [];
          const hasStaff1 = members.some((s) => s.id === "staff_1");
          const hasStaff2 = members.some((s) => s.id === "staff_2");
          if (!hasStaff1 || !hasStaff2 || members.length < 2) {
            state.staffMembers = DEFAULT_STAFF;
          }
        }
      },
    }
  )
);
