import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TimelineEvent {
  id: string;
  type: "vote" | "bill" | "social" | "donation";
  date: string;
  title: string;
  description: string;
  meta?: Record<string, string | number>;
}

interface TimelineResponse {
  success: boolean;
  events: TimelineEvent[];
  error?: string;
}

export function useAccountabilityTimeline(
  legislatorName: string | undefined,
  chamber?: string,
  jurisdiction?: string
) {
  return useQuery<TimelineResponse>({
    queryKey: ["accountability-timeline", legislatorName, chamber, jurisdiction],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-politician-timeline", {
        body: { legislatorName, chamber, jurisdiction },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Failed to fetch timeline");
      return data;
    },
    enabled: !!legislatorName,
    staleTime: 1000 * 60 * 10,
  });
}
