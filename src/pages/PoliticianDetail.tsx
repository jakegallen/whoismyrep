import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import VotingScorecard from "@/components/VotingScorecard";
import CampaignFinance from "@/components/CampaignFinance";
import type { Politician } from "@/lib/politicians";

const PoliticianDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const politician = location.state?.politician as Politician | undefined;

  const [analysis, setAnalysis] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!politician) {
      navigate("/politicians");
      return;
    }

    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke("analyze-article", {
          body: {
            url: politician.socialHandles?.x
              ? `https://x.com/${politician.socialHandles.x}`
              : `https://www.google.com/search?q=${encodeURIComponent(politician.name + " Nevada politics")}`,
            title: `${politician.name} — ${politician.title}`,
            summary: politician.bio,
            category: "politician",
          },
        });

        if (fnError) throw new Error(fnError.message);
        if (!data?.success) throw new Error(data?.error || "Failed to generate profile");

        setAnalysis(data.analysis);
      } catch (e) {
        console.error("Profile error:", e);
        setError(e instanceof Error ? e.message : "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [politician, navigate]);

  if (!politician) return null;

  const partyColor =
    politician.party === "Democrat"
      ? "text-[hsl(210,80%,55%)]"
      : politician.party === "Republican"
        ? "text-primary"
        : "text-[hsl(43,90%,55%)]";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center gap-4 px-4 py-3">
          <button
            onClick={() => navigate("/politicians")}
            className="flex items-center gap-1.5 rounded-lg bg-surface-elevated px-3 py-2 font-body text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="h-5 w-px bg-border" />
          <span className="font-display text-sm font-semibold text-headline">
            Politician Profile
          </span>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Profile header */}
          <div className="flex items-start gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-surface-elevated font-display text-2xl font-bold text-muted-foreground">
              {politician.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-headline">{politician.name}</h1>
              <p className={`font-body text-base font-semibold ${partyColor}`}>
                {politician.title} · {politician.party}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-tertiary" />
                <span className="font-body text-sm text-tertiary">{politician.region}</span>
              </div>
            </div>
          </div>

          {/* Bio */}
          <p className="mt-6 font-body text-sm leading-relaxed text-secondary-custom">
            {politician.bio}
          </p>

          {/* Key issues */}
          <div className="mt-4 flex flex-wrap gap-2">
            {politician.keyIssues.map((issue) => (
              <span
                key={issue}
                className="rounded-lg bg-surface-elevated px-3 py-1.5 font-body text-xs font-medium text-muted-foreground"
              >
                {issue}
              </span>
            ))}
          </div>

          {/* Links */}
          <div className="mt-4 flex gap-3">
            {politician.socialHandles?.x && (
              <a
                href={`https://x.com/${politician.socialHandles.x}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 font-body text-sm font-medium text-primary hover:text-crimson-glow"
              >
                @{politician.socialHandles.x}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <div className="my-8 h-px bg-border" />

          {/* Voting Scorecard */}
          <VotingScorecard
            politicianId={politician.id}
            keyIssues={politician.keyIssues}
            party={politician.party}
          />

          <div className="my-8 h-px bg-border" />

          {/* Campaign Finance */}
          <CampaignFinance
            politicianId={politician.id}
            party={politician.party}
            level={politician.level}
          />

          <div className="my-8 h-px bg-border" />
          <h2 className="mb-6 font-display text-xl font-bold text-headline">
            Recent Activity & Analysis
          </h2>

          {isLoading && (
            <div className="flex flex-col items-center gap-4 py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="font-body text-sm text-muted-foreground">
                Researching recent activity...
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-5">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-body text-sm font-medium text-foreground">Couldn't load analysis</p>
                <p className="mt-1 font-body text-xs text-muted-foreground">{error}</p>
              </div>
            </div>
          )}

          {!isLoading && !error && analysis && (
            <article>
              <ReactMarkdown
                components={{
                  h2: ({ children }) => (
                    <h2 className="mb-3 mt-8 font-display text-xl font-bold text-headline first:mt-0">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="mb-2 mt-6 font-display text-lg font-semibold text-headline">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="mb-4 font-body text-sm leading-relaxed text-secondary-custom">{children}</p>
                  ),
                  ul: ({ children }) => <ul className="mb-4 ml-4 list-disc space-y-2">{children}</ul>,
                  li: ({ children }) => (
                    <li className="font-body text-sm leading-relaxed text-secondary-custom">{children}</li>
                  ),
                  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-crimson-glow">
                      {children}
                    </a>
                  ),
                }}
              >
                {analysis}
              </ReactMarkdown>
            </article>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default PoliticianDetail;
