import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 10,
      retryDelay: (attemptIndex) => Math.min(1_000 * 2 ** attemptIndex, 5_000),
      refetchOnReconnect: true,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      staleTime: 5_000
    }
  }
});
