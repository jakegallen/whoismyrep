import { useQuery } from "@tanstack/react-query";
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
  abstract?: string;
  subject?: string[];
  dateIntroduced?: string;
  latestActionDate?: string;
}

// ── useBills ──

async function fetchBills(params: {
  search?: string;
  jurisdiction?: string;
  level?: string;
  bioguideId?: string;
}) {
  const { data, error } = await supabase.functions.invoke("fetch-bills", {
    body: params,
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Failed to fetch bills");
  return { bills: (data.bills || []) as Bill[], total: (data.total || 0) as number };
}

export function useBills(search?: string, jurisdiction?: string, level?: string, bioguideId?: string) {
  const query = useQuery({
    queryKey: ["bills", search, jurisdiction, level, bioguideId],
    queryFn: () => fetchBills({ search, jurisdiction, level, bioguideId }),
  });

  return {
    bills: query.data?.bills ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

// ── useBillDetail (summarize) ──

async function fetchBillSummary(bill: Bill) {
  const { data, error } = await supabase.functions.invoke("summarize-bill", {
    body: { billUrl: bill.url, billNumber: bill.billNumber, billTitle: bill.title },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Failed to summarize bill");
  return {
    summary: (data.summary as string) || null,
    sponsors: (data.sponsors as string[]) || [],
    status: (data.status as string) || "Introduced",
    rawContent: (data.rawContent as string) || null,
  };
}

export function useBillDetail(bill: Bill | null) {
  const query = useQuery({
    queryKey: ["billDetail", bill?.id],
    queryFn: () => fetchBillSummary(bill!),
    enabled: !!bill,
  });

  return {
    summary: query.data?.summary ?? null,
    sponsors: query.data?.sponsors ?? [],
    status: query.data?.status ?? "Introduced",
    rawContent: query.data?.rawContent ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  };
}

// ── Detailed bill data (roll calls, amendments, versions) from OpenStates ──

export interface RollCallVote {
  id: string;
  date: string;
  motion: string;
  classification: string[];
  result: "Passed" | "Failed";
  chamber: string;
  yesCount: number;
  noCount: number;
  otherCount: number;
  yesVoters: string[];
  noVoters: string[];
  otherVoters: string[];
  totalVoters: number;
}

export interface BillAction {
  date: string;
  description: string;
  classification: string[];
  organization: string;
  chamber: string;
}

export interface BillVersion {
  note: string;
  date: string;
  links: { url: string; mediaType: string }[];
}

export interface BillDocument {
  note: string;
  date: string;
  links: { url: string; mediaType: string }[];
}

export interface BillSponsorDetail {
  name: string;
  classification: string;
  primary: boolean;
  entityType: string;
}

export interface BillDetailData {
  rollCalls: RollCallVote[];
  actions: BillAction[];
  amendments: BillAction[];
  versions: BillVersion[];
  documents: BillDocument[];
  sponsors: BillSponsorDetail[];
  subject: string[];
  abstracts: string[];
}

async function fetchBillOpenStatesDetail(bill: Bill, jurisdiction?: string): Promise<BillDetailData> {
  const { data, error } = await supabase.functions.invoke("fetch-bill-detail", {
    body: {
      billId: bill.id.startsWith("ocd-bill") ? bill.id : undefined,
      jurisdiction,
      session: bill.session,
      identifier: bill.billNumber,
    },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Failed to fetch bill detail");
  return {
    rollCalls: data.rollCalls || [],
    actions: data.actions || [],
    amendments: data.amendments || [],
    versions: data.versions || [],
    documents: data.documents || [],
    sponsors: data.sponsors || [],
    subject: data.subject || [],
    abstracts: data.abstracts || [],
  };
}

export function useBillOpenStatesDetail(bill: Bill | null, jurisdiction?: string) {
  const query = useQuery({
    queryKey: ["billOpenStatesDetail", bill?.id, jurisdiction],
    queryFn: () => fetchBillOpenStatesDetail(bill!, jurisdiction),
    enabled: !!bill,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  };
}
