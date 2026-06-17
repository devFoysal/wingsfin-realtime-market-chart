import { useEffect, useRef } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useQueryErrorToast(queryClient: QueryClient) {
  const seen = useRef(new Set<string>());

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      const query = event?.query;
      if (!query || query.state.status !== "error") return;

      const key = JSON.stringify(query.queryKey);
      const errorId = `${key}:${query.state.errorUpdatedAt}`;
      if (seen.current.has(errorId)) return;
      seen.current.add(errorId);

      const message = query.state.error instanceof Error ? query.state.error.message : "Unable to load data";
      toast.error(message);
    });

    return () => unsubscribe();
  }, [queryClient]);
}
