import { motion } from "framer-motion";
import { Headphones, Play, ExternalLink, Clock } from "lucide-react";
import type { PodcastEpisode } from "@/hooks/usePodcasts";

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

const PodcastCard = ({ episode, index }: { episode: PodcastEpisode; index: number }) => {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/30 hover:shadow-glow"
    >
      <div className="flex gap-4">
        {/* Podcast artwork */}
        {episode.podcastImage ? (
          <img
            src={episode.podcastImage}
            alt={episode.podcastName}
            className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Headphones className="h-7 w-7 text-primary" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          {/* Podcast name + time */}
          <div className="mb-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wider text-primary">
              <Headphones className="h-3 w-3" />
              Podcast
            </span>
            <span className="font-body text-xs text-muted-foreground">•</span>
            <span className="font-body text-xs text-muted-foreground">{timeAgo(episode.pubDate)}</span>
          </div>

          {/* Title */}
          <h3 className="font-display text-base font-bold leading-snug text-foreground line-clamp-2">
            {episode.title}
          </h3>

          {/* Description */}
          <p className="mt-1.5 font-body text-sm leading-relaxed text-muted-foreground line-clamp-2">
            {episode.description}
          </p>

          {/* Footer */}
          <div className="mt-3 flex items-center gap-4">
            <span className="font-body text-xs text-muted-foreground">{episode.podcastName}</span>

            {episode.duration && (
              <span className="flex items-center gap-1 font-body text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {episode.duration}
              </span>
            )}

            <div className="ml-auto flex items-center gap-2">
              {episode.audioUrl && (
                <a
                  href={episode.audioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 font-body text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                >
                  <Play className="h-3 w-3" />
                  Play
                </a>
              )}
              {episode.episodeUrl && (
                <a
                  href={episode.episodeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 font-body text-xs text-muted-foreground transition-colors hover:text-primary"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
};

export default PodcastCard;
