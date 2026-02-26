import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  date: string;
  url: string;
  meta: Record<string, any>;
}

export interface UnifiedSearchResponse {
  query: string;
  results: Record<string, SearchResult[]>;
  counts: Record<string, number>;
  totalResults: number;
}

export type SearchSource = "bills" | "court_cases" | "lobbying" | "federal_register" | "news";

export const SOURCE_LABELS: Record<SearchSource, string> = {
  bills: "Bills",
  court_cases: "Court Cases",
  lobbying: "Lobbying",
  federal_register: "Federal Register",
  news: "News",
};

export function useUnifiedSearch() {
  const [data, setData] = useState<UnifiedSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, sources?: SearchSource[]) => {
    if (!query || query.trim().length < 2) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: resp, error: fnError } = await supabase.functions.invoke("unified-search", {
        body: { query: query.trim(), sources },
      });

      if (fnError) throw new Error(fnError.message);
      if (!resp?.success) throw new Error(resp?.error || "Search failed");

      setData(resp);
    } catch (e) {
      console.error("Unified search failed:", e);
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, isLoading, error, search, clear };
}
