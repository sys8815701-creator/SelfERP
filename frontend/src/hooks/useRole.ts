"use client";

import { useState, useEffect } from "react";

export type UserRole = "admin" | "accountant" | "employee";

export function useRole(): UserRole {
  const [role, setRole] = useState<UserRole>(() => {
    if (typeof window !== "undefined") {
      try {
        return (JSON.parse(localStorage.getItem("user") || "{}").role as UserRole) || "employee";
      } catch {
        return "employee";
      }
    }
    return "employee";
  });

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      setRole((u.role as UserRole) || "employee");
    } catch {
      setRole("employee");
    }
  }, []);

  return role;
}

export const canWrite = (role: UserRole): boolean =>
  role === "admin" || role === "accountant";

export const canDelete = (role: UserRole): boolean =>
  role === "admin";

export function useIsPlatformAdmin(): boolean {
  const [isPlatformAdmin, setIsPlatformAdmin] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try { return Boolean(JSON.parse(localStorage.getItem("user") || "{}").is_platform_admin); }
      catch { return false; }
    }
    return false;
  });

  useEffect(() => {
    try { setIsPlatformAdmin(Boolean(JSON.parse(localStorage.getItem("user") || "{}").is_platform_admin)); }
    catch { setIsPlatformAdmin(false); }
  }, []);

  return isPlatformAdmin;
}
