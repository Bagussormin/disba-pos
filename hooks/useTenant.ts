import { useMemo } from "react";

/**
 * Custom hook untuk mengambil identitas tenant (toko) yang sedang aktif.
 * Menangani pengecekan SSR secara aman.
 */
export function useTenant() {
  const tenantId = useMemo(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("tenant_id");
    }
    return null;
  }, []);

  return {
    tenantId,
    isReady: !!tenantId
  };
}