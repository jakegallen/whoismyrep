import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CivicRep } from "./useCivicReps";

// ── Types ──

export interface SchoolBoardMember {
  name: string;
  office: string;
  level: "school_board";
  party: string;
  phone?: string;
  email?: string;
  website?: string;
  photoUrl?: string;
  channels?: Record<string, string>;
  divisionId: string;
  district?: string;
}

export interface SchoolDistrict {
  name: string;
  ocdId: string;
}

export interface SchoolBoardResult {
  members: SchoolBoardMember[];
  districts: SchoolDistrict[];
  message?: string;
}

// ── Convert SchoolBoardMember → CivicRep for shared components ──

export function schoolBoardMemberToCivicRep(member: SchoolBoardMember): CivicRep {
  const socialHandles: Record<string, string> = {};
  if (member.channels) {
    for (const [key, value] of Object.entries(member.channels)) {
      socialHandles[key] = value;
    }
  }

  return {
    name: member.name,
    office: member.office,
    level: "school_board",
    party: member.party,
    phone: member.phone,
    email: member.email,
    website: member.website,
    photoUrl: member.photoUrl,
    socialHandles: Object.keys(socialHandles).length > 0 ? socialHandles : undefined,
    divisionId: member.divisionId,
    jurisdiction: member.district,
  };
}

// ── Fetcher ──

async function fetchSchoolBoard(address: string): Promise<SchoolBoardResult> {
  const { data, error } = await supabase.functions.invoke("fetch-school-board", {
    body: { address },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "School board lookup failed");
  return {
    members: data.members || [],
    districts: data.districts || [],
    message: data.message,
  };
}

// ── Hook ──

interface UseSchoolBoardResult {
  members: SchoolBoardMember[];
  districts: SchoolDistrict[];
  message?: string;
  isLoading: boolean;
  error: string | null;
  lookup: (address: string) => Promise<SchoolBoardResult | null>;
  reset: () => void;
}

export function useSchoolBoard(): UseSchoolBoardResult {
  const mutation = useMutation({
    mutationFn: fetchSchoolBoard,
  });

  const lookup = useCallback(
    async (address: string): Promise<SchoolBoardResult | null> => {
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
    members: mutation.data?.members ?? [],
    districts: mutation.data?.districts ?? [],
    message: mutation.data?.message,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
    lookup,
    reset,
  };
}
