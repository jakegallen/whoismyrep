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

async function fetchCalendar(): Promise<CalendarResponse> {
  const { data, error } = await supabase.functions.invoke("fetch-legislative-calendar");

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Failed to fetch calendar");

  return {
    events: data.events || [],
    session: data.session || "",
  };
}

export function useLegislativeCalendar() {
  return useQuery({
    queryKey: ["legislative-calendar"],
    queryFn: fetchCalendar,
    staleTime: 1000 * 60 * 15,
    retry: 1,
  });
}
