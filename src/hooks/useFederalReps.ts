import { useState, useEffect, useCallback } from "react";
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

interface UseFederalRepsResult {
  reps: FederalRep[];
  isLoading: boolean;
  error: string | null;
}

export function useFederalReps(stateAbbr?: string): UseFederalRepsResult {
  const [reps, setReps] = useState<FederalRep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReps = useCallback(async () => {
    if (!stateAbbr) {
      setReps([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("fetch-civic-reps", {
        body: { stateAbbr },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "Failed to fetch federal representatives");

      setReps(data.representatives || []);
    } catch (e) {
      console.error("Failed to fetch federal reps:", e);
      setError(e instanceof Error ? e.message : "Failed to fetch federal representatives");
    } finally {
      setIsLoading(false);
    }
  }, [stateAbbr]);

  useEffect(() => {
    fetchReps();
  }, [fetchReps]);

  return { reps, isLoading, error };
}
