"use client";

import { createContext, useContext, type ReactNode } from "react";

export type AdminProfile = {
  id: string;
  fullName: string;
  role: "SUPER_ADMIN" | "ADMIN";
};

const AdminProfileContext = createContext<AdminProfile | null>(null);

export function AdminProfileProvider({
  value,
  children,
}: {
  value: AdminProfile | null;
  children: ReactNode;
}) {
  return <AdminProfileContext.Provider value={value}>{children}</AdminProfileContext.Provider>;
}

export function useAdminProfile(): AdminProfile | null {
  return useContext(AdminProfileContext);
}
