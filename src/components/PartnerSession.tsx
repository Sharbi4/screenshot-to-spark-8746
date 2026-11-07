import { createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";
export const PartnerSession = createContext<{ user: User | null; ready: boolean }>({ user: null, ready: false });
export const usePartnerSession = () => useContext(PartnerSession);