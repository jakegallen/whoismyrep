import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FederalRep {
  name: string;
  office: string;
  level: "federal";
  party: string;
  phone?: string;
  email?: string;
  website?: string;
  photoUrl?: string;
  socialHandles?: {
    x?: string;
    facebook?: string;
    instagram?: string;
  };
  bioguideId?: string;
  divisionId?: string;
}

async function fetchFederalReps(stateAbbr: string): Promise<FederalRep[]> {
  const { data, error } = await supabase.functions.invoke("fetch-civic-reps", {
    body: { stateAbbr },
  });

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Failed to fetch federal representatives");

  return data.representatives || [];
}

export function useFederalReps(stateAbbr?: string) {
  const query = useQuery({
    queryKey: ["federal-reps", stateAbbr],
    queryFn: () => fetchFederalReps(stateAbbr!),
    enabled: !!stateAbbr,
    staleTime: 10 * 60 * 1000,
  });

  return {
    reps: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  };
}
