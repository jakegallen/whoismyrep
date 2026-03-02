/**
 * Re-export useAuth from the centralized AuthContext.
 *
 * All existing `import { useAuth } from "@/hooks/useAuth"` imports
 * continue to work — they now read from a single shared context
 * instead of each creating their own Supabase auth subscription.
 */
export { useAuth } from "@/contexts/AuthContext";
