import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CivicRep } from "./useCivicReps";

// ── Types ──

export interface MunicipalOfficial {
  name: string;
  office: string;
  level: "local";
  party: string;
  phone?: string;
  email?: string;
  website?: string;
  photoUrl?: string;
  channels?: Record<string, string>;
  divisionId: string;
  municipality?: string;
}

export interface MunicipalResult {
  officials: MunicipalOfficial[];
  message?: string;
}

// ── Convert MunicipalOfficial → CivicRep for shared components ──

export function municipalOfficialToCivicRep(official: MunicipalOfficial): CivicRep {
  const socialHandles: Record<string, string> = {};
  if (official.channels) {
    for (const [key, value] of Object.entries(official.channels)) {
      socialHandles[key] = value;
    }
  }

  return {
    name: official.name,
    office: official.office,
    level: "local",
    party: official.party,
    phone: official.phone,
    email: official.email,
    website: official.website,
    photoUrl: official.photoUrl,
    socialHandles: Object.keys(socialHandles).length > 0 ? socialHandles : undefined,
    divisionId: official.divisionId,
    jurisdiction: official.municipality,
  };
}

// ── Fetcher ──

async function fetchMunicipalOfficials(address: string): Promise<MunicipalResult> {
  const { data, error } = await supabase.functions.invoke("fetch-municipal-officials", {
    body: { address },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Municipal officials lookup failed");
  return {
    officials: data.officials || [],
    message: data.message,
  };
}

// ── Hook ──

interface UseMunicipalOfficialsResult {
  officials: MunicipalOfficial[];
  message?: string;
  isLoading: boolean;
  error: string | null;
  lookup: (address: string) => Promise<MunicipalResult | null>;
  reset: () => void;
}

export function useMunicipalOfficials(): UseMunicipalOfficialsResult {
  const mutation = useMutation({
    mutationFn: fetchMunicipalOfficials,
  });

  const lookup = useCallback(
    async (address: string): Promise<MunicipalResult | null> => {
      try {
        return await mutation.mutateAsync(address);
      } catch {
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mutation.mutateAsync],
  );

  const reset = useCallback(() => {
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutation.reset]);

  return {
    officials: mutation.data?.officials ?? [],
    message: mutation.data?.message,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
    lookup,
    reset,
  };
}
