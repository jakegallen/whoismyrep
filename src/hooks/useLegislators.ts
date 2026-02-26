import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Legislator {
  id: string;
  name: string;
  title: string;
  party: "Democrat" | "Republican" | "Independent" | "Nonpartisan" | string;
  office: string;
  region: string;
  level: "state";
  imageUrl?: string;
  chamber: "Senate" | "Assembly";
  district: string;
  email?: string;
  website?: string;
  socialHandles?: {
    x?: string;
    facebook?: string;
    instagram?: string;
  };
  openstatesUrl?: string;
}

interface UseLegislatorsResult {
  legislators: Legislator[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useLegislators(chamber?: string, jurisdiction?: string): UseLegislatorsResult {
  const [legislators, setLegislators] = useState<Legislator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLegislators = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("fetch-legislators", {
        body: { chamber, per_page: 100, jurisdiction },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "Failed to fetch legislators");

      setLegislators(data.legislators || []);
    } catch (e) {
      console.error("Failed to fetch legislators:", e);
      setError(e instanceof Error ? e.message : "Failed to fetch legislators");
    } finally {
      setIsLoading(false);
    }
  }, [chamber, jurisdiction]);

  useEffect(() => {
    fetchLegislators();
  }, [fetchLegislators]);

  return { legislators, isLoading, error, refetch: fetchLegislators };
}
