import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CivicRep {
  name: string;
  office: string;
  level: "federal" | "state" | "county" | "local";
  party: string;
  phone?: string;
  email?: string;
  website?: string;
  photoUrl?: string;
  socialHandles?: Record<string, string>;
  divisionId: string;
}

export interface CivicGroup {
  level: "federal" | "state" | "county" | "local";
  label: string;
  representatives: CivicRep[];
}

interface UseCivicRepsResult {
  groups: CivicGroup[] | null;
  normalizedAddress: string;
  totalReps: number;
  isLoading: boolean;
  error: string | null;
  lookup: (address: string) => Promise<void>;
  reset: () => void;
}

export function useCivicReps(): UseCivicRepsResult {
  const [groups, setGroups] = useState<CivicGroup[] | null>(null);
  const [normalizedAddress, setNormalizedAddress] = useState("");
  const [totalReps, setTotalReps] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (address: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("fetch-civic-reps", {
        body: { address },
      });
      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "Lookup failed");

      setGroups(data.groups);
      setNormalizedAddress(data.normalizedAddress || address);
      setTotalReps(data.totalReps || 0);
    } catch (e) {
      console.error("Civic reps lookup failed:", e);
      setError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setGroups(null);
    setNormalizedAddress("");
    setTotalReps(0);
    setError(null);
  }, []);

  return { groups, normalizedAddress, totalReps, isLoading, error, lookup, reset };
}
