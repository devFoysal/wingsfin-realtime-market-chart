import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import App from "./app/App";
import "./assets/styles/global.css";

const queryClient = new QueryClient({
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  </StrictMode>
);
