import { useState, useEffect, useRef } from "react";
import { Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { US_STATES, type USState } from "@/lib/usStates";

interface StateAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (state: USState) => void;
  placeholder?: string;
  inputClassName?: string;
}

export function StateAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Search by state name or abbreviation…",
  inputClassName,
}: StateAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered =
    value.trim().length === 0
      ? []
      : US_STATES.filter((s) => {
          const q = value.trim().toLowerCase();
          return (
            s.name.toLowerCase().startsWith(q) ||
            s.abbr.toLowerCase() === q
          );
        }).slice(0, 8);

  useEffect(() => {
    setIsOpen(filtered.length > 0);
    setHighlightedIndex(-1);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleSelect = (state: USState) => {
    onChange(state.name);
    setIsOpen(false);
    onSelect(state);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(filtered[highlightedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (filtered.length > 0) setIsOpen(true);
        }}
        placeholder={placeholder}
        className={
          inputClassName ||
          "h-14 rounded-xl border-border bg-card pl-12 pr-4 font-body text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
        }
        autoComplete="off"
      />

      {isOpen && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
          {filtered.map((s, i) => (
            <button
              key={s.abbr}
              type="button"
              onClick={() => handleSelect(s)}
              onMouseEnter={() => setHighlightedIndex(i)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === highlightedIndex
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-accent/50"
              }`}
            >
              <span className="w-8 shrink-0 font-display text-sm font-bold">{s.abbr}</span>
              <span className="font-body text-sm">{s.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
