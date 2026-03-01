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
  elections: ElectionInfo[];
  voterInfo: VoterInfo | null;
}

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
  const [groups, setGroups] = useState<CivicGroup[] | null>(null);
  const [normalizedAddress, setNormalizedAddress] = useState("");
  const [totalReps, setTotalReps] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elections, setElections] = useState<ElectionInfo[]>([]);
  const [voterInfo, setVoterInfo] = useState<VoterInfo | null>(null);

  const lookup = useCallback(async (address: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("fetch-civic-reps", {
        body: { address },
      });
      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "Lookup failed");

      const result: LookupResult = {
        groups: data.groups,
        normalizedAddress: data.normalizedAddress || address,
        elections: data.elections || [],
        voterInfo: data.voterInfo || null,
      };
      setGroups(result.groups);
      setNormalizedAddress(result.normalizedAddress);
      setTotalReps(data.totalReps || 0);
      setElections(result.elections);
      setVoterInfo(result.voterInfo);
      return result;
    } catch (e) {
      console.error("Civic reps lookup failed:", e);
      setError(e instanceof Error ? e.message : "Lookup failed");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setGroups(null);
    setNormalizedAddress("");
    setTotalReps(0);
    setError(null);
    setElections([]);
    setVoterInfo(null);
  }, []);

  return { groups, normalizedAddress, totalReps, isLoading, error, elections, voterInfo, lookup, reset };
}
