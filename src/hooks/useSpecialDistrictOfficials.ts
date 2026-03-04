import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CivicRep } from "./useCivicReps";

// ── Types ──

export interface SpecialDistrictOfficial {
  name: string;
  office: string;
  level: "special_district";
  party: string;
  phone?: string;
  email?: string;
  website?: string;
  photoUrl?: string;
  channels?: Record<string, string>;
  divisionId: string;
  district?: string;
}

export interface SpecialDistrictResult {
  officials: SpecialDistrictOfficial[];
  message?: string;
}

// ── Convert SpecialDistrictOfficial → CivicRep for shared components ──

export function specialDistrictOfficialToCivicRep(official: SpecialDistrictOfficial): CivicRep {
  const socialHandles: Record<string, string> = {};
  if (official.channels) {
    for (const [key, value] of Object.entries(official.channels)) {
      socialHandles[key] = value;
    }
  }

  return {
    name: official.name,
    office: official.office,
    level: "special_district",
    party: official.party,
    phone: official.phone,
    email: official.email,
    website: official.website,
    photoUrl: official.photoUrl,
    socialHandles: Object.keys(socialHandles).length > 0 ? socialHandles : undefined,
    divisionId: official.divisionId,
    jurisdiction: official.district,
  };
}

// ── Fetcher ──

async function fetchSpecialDistrictOfficials(address: string): Promise<SpecialDistrictResult> {
  const { data, error } = await supabase.functions.invoke("fetch-special-district-officials", {
    body: { address },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Special district officials lookup failed");
  return {
    officials: data.officials || [],
    message: data.message,
  };
}

// ── Hook ──

interface UseSpecialDistrictOfficialsResult {
  officials: SpecialDistrictOfficial[];
  message?: string;
  isLoading: boolean;
  error: string | null;
  lookup: (address: string) => Promise<SpecialDistrictResult | null>;
  reset: () => void;
}

export function useSpecialDistrictOfficials(): UseSpecialDistrictOfficialsResult {
  const mutation = useMutation({
    mutationFn: fetchSpecialDistrictOfficials,
  });

  const lookup = useCallback(
    async (address: string): Promise<SpecialDistrictResult | null> => {
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
