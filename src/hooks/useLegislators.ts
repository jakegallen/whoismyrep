import { useQuery } from "@tanstack/react-query";
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

// ── Fetcher ──

async function fetchLegislators(params: {
  chamber?: string;
  jurisdiction?: string;
}): Promise<Legislator[]> {
  const { data, error } = await supabase.functions.invoke("fetch-legislators", {
    body: { chamber: params.chamber, per_page: 50, jurisdiction: params.jurisdiction },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Failed to fetch legislators");
  return (data.legislators || []) as Legislator[];
}

// ── Hook ──

export function useLegislators(chamber?: string, jurisdiction?: string) {
  const query = useQuery({
    queryKey: ["legislators", chamber, jurisdiction],
    queryFn: () => fetchLegislators({ chamber, jurisdiction }),
    enabled: !!jurisdiction,
  });

  return {
    legislators: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}
