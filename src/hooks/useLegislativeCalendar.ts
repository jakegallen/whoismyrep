import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CalendarEvent {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  type: "hearing" | "committee" | "vote" | "session" | "other";
  chamber: string;
  relatedBills: string[];
  source: string;
}

interface CalendarResponse {
  events: CalendarEvent[];
  session: string;
}

async function fetchCalendar(stateAbbr?: string, jurisdiction?: string): Promise<CalendarResponse> {
  const { data, error } = await supabase.functions.invoke("fetch-legislative-calendar", {
    body: { stateAbbr, jurisdiction },
  });

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Failed to fetch calendar");

  return {
    events: data.events || [],
    session: data.session || "",
  };
}

export function useLegislativeCalendar(stateAbbr?: string, jurisdiction?: string) {
  return useQuery({
    queryKey: ["legislative-calendar", stateAbbr],
    queryFn: () => fetchCalendar(stateAbbr, jurisdiction),
    staleTime: 1000 * 60 * 15,
    retry: 1,
  });
}
