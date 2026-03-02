import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──

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
  jurisdiction?: string;
  bioguideId?: string;
}

export interface CivicGroup {
  level: "federal" | "state" | "county" | "local";
  label: string;
  representatives: CivicRep[];
}

export interface ElectionInfo {
  id: string;
  name: string;
  electionDay: string;
  ocdDivisionId: string;
}

export interface PollingLocation {
  name: string;
  address: string;
  hours: string;
  notes: string;
  sources: string[];
}

export interface Contest {
  type: string;
  office: string;
  district: string;
  level: string;
  candidates: { name: string; party: string; url: string }[];
  referendumTitle?: string;
  referendumSubtitle?: string;
  referendumText?: string;
  referendumUrl?: string;
}

export interface VoterInfo {
  election: ElectionInfo | null;
  pollingLocations: PollingLocation[];
  earlyVoteSites: PollingLocation[];
  dropOffLocations: PollingLocation[];
  contests: Contest[];
  stateElectionInfoUrl: string;
  localElectionInfoUrl: string;
}

export interface LookupResult {
  groups: CivicGroup[];
  normalizedAddress: string;
  totalReps: number;
  elections: ElectionInfo[];
  voterInfo: VoterInfo | null;
}

// ── Fetcher ──

async function fetchCivicReps(address: string): Promise<LookupResult> {
  const { data, error } = await supabase.functions.invoke("fetch-civic-reps", {
    body: { address },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Lookup failed");
  return {
    groups: data.groups,
    normalizedAddress: data.normalizedAddress || address,
    totalReps: data.totalReps || 0,
    elections: data.elections || [],
    voterInfo: data.voterInfo || null,
  };
}

// ── Hook ──

interface UseCivicRepsResult {
  groups: CivicGroup[] | null;
  normalizedAddress: string;
  totalReps: number;
  isLoading: boolean;
  error: string | null;
  elections: ElectionInfo[];
  voterInfo: VoterInfo | null;
  lookup: (address: string) => Promise<LookupResult | null>;
  reset: () => void;
}

export function useCivicReps(): UseCivicRepsResult {
  const mutation = useMutation({
    mutationFn: fetchCivicReps,
  });

  const lookup = useCallback(
    async (address: string): Promise<LookupResult | null> => {
      try {
        return await mutation.mutateAsync(address);
      } catch {
        // Error is captured in mutation.error — return null to match legacy API
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
    groups: mutation.data?.groups ?? null,
    normalizedAddress: mutation.data?.normalizedAddress ?? "",
    totalReps: mutation.data?.totalReps ?? 0,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
    elections: mutation.data?.elections ?? [],
    voterInfo: mutation.data?.voterInfo ?? null,
    lookup,
    reset,
  };
}
