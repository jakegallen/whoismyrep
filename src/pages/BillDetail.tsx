import { useParams, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  Loader2,
  Landmark,
  Building2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBillDetail, type Bill } from "@/hooks/useBills";
import ReactMarkdown from "react-markdown";

const BillDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const bill = (location.state as { bill?: Bill })?.bill || null;
  const { summary, sponsors, status, isLoading, error } = useBillDetail(bill);

  if (!bill) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <FileText className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 font-body text-muted-foreground">
          Bill not found. Go back and select a bill.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/bills")}>
          Back to Bills
        </Button>
      </div>
    );
  }

  const ChamberIcon = bill.chamber === "Senate" ? Landmark : Building2;

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-hero border-b border-border">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-4">
              <button
                onClick={() => navigate("/bills")}
                className="flex items-center gap-1.5 font-body text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Bills
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <ChamberIcon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-headline md:text-3xl">
                  {bill.billNumber}
                </h1>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {bill.chamber}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {bill.type}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {status || bill.status}
                  </Badge>
                </div>
              </div>
            </div>
            <p className="mt-3 max-w-2xl font-body text-sm text-secondary-custom">
              {bill.title}
            </p>
            <div className="mt-3">
              <a
                href={bill.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-body text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View on Nevada Legislature website
              </a>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* AI Summary */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-bold text-headline">
                  AI Analysis
                </h2>
              </div>

              {isLoading && (
                <div className="flex flex-col items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="mt-3 font-body text-sm text-muted-foreground">
                    Analyzing bill content with AI…
                  </p>
                  <p className="mt-1 font-body text-xs text-muted-foreground/70">
                    This may take a few seconds
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                  <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
                  <div>
                    <p className="font-body text-sm font-medium text-foreground">
                      Analysis failed
                    </p>
                    <p className="font-body text-xs text-muted-foreground">{error}</p>
                  </div>
                </div>
              )}

              {summary && !isLoading && (
                <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-display prose-headings:text-headline prose-p:text-secondary-custom prose-p:font-body prose-li:text-secondary-custom prose-li:font-body">
                  <ReactMarkdown>{summary}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Bill Info */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="mb-3 font-display text-sm font-bold text-headline">
                Bill Information
              </h3>
              <dl className="space-y-2.5 font-body text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Bill Number</dt>
                  <dd className="font-medium text-foreground">{bill.billNumber}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Chamber</dt>
                  <dd className="text-foreground">{bill.chamber}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Type</dt>
                  <dd className="text-foreground">{bill.type}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Session</dt>
                  <dd className="text-foreground">83rd Session (2025)</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Status</dt>
                  <dd className="text-foreground">{status || bill.status}</dd>
                </div>
              </dl>
            </div>

            {/* Sponsors */}
            {(sponsors.length > 0 || bill.sponsors.length > 0) && (
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="mb-3 font-display text-sm font-bold text-headline">
                  Sponsors
                </h3>
                <ul className="space-y-1.5">
                  {(sponsors.length > 0 ? sponsors : bill.sponsors).map((s, i) => (
                    <li
                      key={i}
                      className="font-body text-sm text-secondary-custom"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default BillDetail;
