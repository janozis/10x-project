import * as React from "react";
import { supabaseClient } from "@/db/supabase.client";

export function useRealtimeCampDay(campDayId: string, onExternalChange: () => void) {
  React.useEffect(() => {
    // Skip realtime if Supabase client is not available (e.g., missing env vars)
    if (!supabaseClient) {
      console.warn("[useRealtimeCampDay] Supabase client not available, skipping realtime subscription");
      return;
    }

    const channel = supabaseClient
      .channel(`camp-day-${campDayId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_schedules", filter: `camp_day_id=eq.${campDayId}` },
        () => {
          onExternalChange();
        }
      )
      .subscribe();

    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, [campDayId, onExternalChange]);
}
