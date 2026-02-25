import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Bill {
  id: string;
  billNumber: string;
  title: string;
  chamber: "Assembly" | "Senate";
  type: string;
  session: string;
  status: string;
  url: string;
  sponsors: string[];
}

interface UseBillsResult {
  bills: Bill[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useBills(search?: string): UseBillsResult {
  const [bills, setBills] = useState<Bill[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBills = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("fetch-bills", {
        body: { session: "83rd2025", search },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "Failed to fetch bills");

      setBills(data.bills || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error("Failed to fetch bills:", e);
      setError(e instanceof Error ? e.message : "Failed to fetch bills");
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  return { bills, total, isLoading, error, refetch: fetchBills };
}

interface UseBillDetailResult {
  summary: string | null;
  sponsors: string[];
  status: string;
  rawContent: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useBillDetail(bill: Bill | null): UseBillDetailResult {
  const [summary, setSummary] = useState<string | null>(null);
  const [sponsors, setSponsors] = useState<string[]>([]);
  const [status, setStatus] = useState("Introduced");
  const [rawContent, setRawContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bill) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("summarize-bill", {
          body: {
            billUrl: bill.url,
            billNumber: bill.billNumber,
            billTitle: bill.title,
          },
        });

        if (cancelled) return;
        if (fnError) throw new Error(fnError.message);
        if (!data?.success) throw new Error(data?.error || "Failed to summarize bill");

        setSummary(data.summary);
        if (data.sponsors?.length) setSponsors(data.sponsors);
        if (data.status) setStatus(data.status);
        if (data.rawContent) setRawContent(data.rawContent);
      } catch (e) {
        if (cancelled) return;
        console.error("Failed to summarize bill:", e);
        setError(e instanceof Error ? e.message : "Failed to summarize bill");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bill]);

  return { summary, sponsors, status, rawContent, isLoading, error };
}
