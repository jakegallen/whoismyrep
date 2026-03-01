import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { Users, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface PoliticianSuggestion {
  id: string;
  name: string;
  title: string;
  party: string;
  state: string;
  level: "federal" | "state";
}

interface NameAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: PoliticianSuggestion) => void;
  placeholder?: string;
  inputClassName?: string;
}

export interface NameAutocompleteRef {
  closeDropdown: () => void;
}

const PARTY_DOT: Record<string, string> = {
  Democrat: "bg-blue-500",
  Republican: "bg-red-500",
  Independent: "bg-amber-500",
};

export const NameAutocomplete = forwardRef<NameAutocompleteRef, NameAutocompleteProps>(function NameAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Search by representative name…",
  inputClassName,
}, ref) {
  const [suggestions, setSuggestions] = useState<PoliticianSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const justSelectedRef = useRef(false);

  useImperativeHandle(ref, () => ({
    closeDropdown: () => {
      setIsOpen(false);
      setSuggestions([]);
    },
  }));

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    setIsSearching(true);
    try {
      const { data } = await supabase.functions.invoke("search-politicians", {
        body: { query },
      });
      const results: PoliticianSuggestion[] = data?.suggestions || [];
      setSuggestions(results);
      setIsOpen(results.length > 0);
      setHighlightedIndex(-1);
    } catch (e) {
      console.warn("Name autocomplete failed:", e);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, fetchSuggestions]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (suggestion: PoliticianSuggestion) => {
    justSelectedRef.current = true;
    onChange(suggestion.name);
    setIsOpen(false);
    setSuggestions([]);
    onSelect(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
      {isSearching && (
        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // If a suggestion is highlighted, handle nav — otherwise let parent's Enter handler fire
          if (isOpen && suggestions.length > 0 && (e.key === "ArrowDown" || e.key === "ArrowUp" || (e.key === "Enter" && highlightedIndex >= 0) || e.key === "Escape")) {
            handleKeyDown(e);
          }
        }}
        placeholder={placeholder}
        className={inputClassName || "h-14 rounded-xl border-border bg-card pl-12 pr-10 font-body text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"}
        autoComplete="off"
      />

      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
          {suggestions.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleSelect(s)}
              onMouseEnter={() => setHighlightedIndex(i)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === highlightedIndex
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-accent/50"
              }`}
            >
              {/* Party dot */}
              <span className={`h-2 w-2 shrink-0 rounded-full ${PARTY_DOT[s.party] || "bg-muted-foreground"}`} />

              <div className="min-w-0 flex-1">
                <span className="block font-body text-sm font-medium leading-tight">
                  {s.name}
                </span>
                <span className="block font-body text-xs text-muted-foreground">
                  {s.title}{s.state ? ` · ${s.state}` : ""}
                </span>
              </div>

              <span className={`shrink-0 rounded px-1.5 py-0.5 font-body text-[10px] font-semibold ${
                s.level === "federal"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}>
                {s.level === "federal" ? "Federal" : "State"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
