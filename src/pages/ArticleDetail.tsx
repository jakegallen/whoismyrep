import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CategoryBadge from "@/components/CategoryBadge";
import type { NewsItem } from "@/lib/mockNews";

const ArticleDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const article = location.state?.article as NewsItem | undefined;

  const [analysis, setAnalysis] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!article) {
      navigate("/");
      return;
    }

    const fetchAnalysis = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke("analyze-article", {
          body: {
            url: article.url,
            title: article.title,
            summary: article.summary,
            category: article.category,
          },
        });

        if (fnError) throw new Error(fnError.message);
        if (!data?.success) throw new Error(data?.error || "Failed to analyze");

        setAnalysis(data.analysis);
      } catch (e) {
        console.error("Analysis error:", e);
        setError(e instanceof Error ? e.message : "Failed to generate analysis");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalysis();
  }, [article, navigate]);

  if (!article) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header bar */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center gap-4 px-4 py-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 rounded-lg bg-surface-elevated px-3 py-2 font-body text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="h-5 w-px bg-border" />
          <span className="font-display text-sm font-semibold text-headline">
            Nevada Political Pulse
          </span>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-8">
        {/* Article header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-4 flex items-center gap-3">
            <CategoryBadge category={article.category} />
            <span className="font-body text-xs text-tertiary">{article.timeAgo}</span>
            <span className="font-body text-xs text-tertiary">•</span>
            <span className="font-body text-xs text-tertiary">{article.source}</span>
          </div>

          <h1 className="font-display text-3xl font-bold leading-tight text-headline md:text-4xl">
            {article.title}
          </h1>

          <p className="mt-4 font-body text-base leading-relaxed text-secondary-custom">
            {article.summary}
          </p>

          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 font-body text-sm font-medium text-primary transition-colors hover:text-crimson-glow"
            >
              View original source
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          <div className="my-8 h-px bg-border" />
        </motion.div>

        {/* Analysis section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h2 className="mb-6 font-display text-xl font-bold text-headline">
            In-Depth Analysis
          </h2>

          {isLoading && (
            <div className="flex flex-col items-center gap-4 py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-body text-sm font-medium text-foreground">
                  Generating analysis...
                </p>
                <p className="mt-1 font-body text-xs text-muted-foreground">
                  Scraping article and building a comprehensive breakdown
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-5">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-body text-sm font-medium text-foreground">
                  Couldn't generate analysis
                </p>
                <p className="mt-1 font-body text-xs text-muted-foreground">{error}</p>
              </div>
            </div>
          )}

          {!isLoading && !error && analysis && (
            <article className="prose-custom">
              <ReactMarkdown
                components={{
                  h2: ({ children }) => (
                    <h2 className="mb-3 mt-8 font-display text-xl font-bold text-headline first:mt-0">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="mb-2 mt-6 font-display text-lg font-semibold text-headline">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="mb-4 font-body text-sm leading-relaxed text-secondary-custom">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-4 ml-4 list-disc space-y-2">{children}</ul>
                  ),
                  li: ({ children }) => (
                    <li className="font-body text-sm leading-relaxed text-secondary-custom">
                      {children}
                    </li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2 hover:text-crimson-glow"
                    >
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

export default ArticleDetail;
