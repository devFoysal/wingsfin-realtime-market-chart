import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "../App";

vi.mock("echarts-for-react", () => ({
  default: () => <div data-testid="chart" />
}));

class MockEventSource {
  onerror: (() => void) | null = null;
  constructor(_url: string) {}
  addEventListener(_name: string, _handler: () => void) {}
  close() {}
}

vi.stubGlobal("EventSource", MockEventSource);

function historyResponse(status: "OPEN" | "CLOSED") {
  return {
    instrument: { id: 1, symbol: "DSEX", type: "index", displayName: "DSEX Index", yesterdayClose: 5222.22 },
    market: {
      status,
      isOpen: status === "OPEN",
      timezone: "Asia/Dhaka",
      open: "2026-06-15T10:00:00+06:00",
      close: "2026-06-15T14:30:00+06:00",
      now: status === "OPEN" ? "2026-06-15T10:01:00+06:00" : "2026-06-15T09:00:00+06:00"
    },
    points:
      status === "OPEN"
        ? [{ minute: "2026-06-15T10:00:00+06:00", value: 5222.22, carried: false, isLatest: true, color: "#EE27F5" }]
        : [],
    referenceValue: 5222.22
  };
}

function marketStatus(status: "OPEN" | "CLOSED") {
  return historyResponse(status).market;
}

function mockApi(initialStatus: "OPEN" | "CLOSED", polledStatuses: Array<"OPEN" | "CLOSED"> = [initialStatus]) {
  let pollIndex = 0;
  let currentStatus = initialStatus;
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/market/status")) {
      currentStatus = polledStatuses[Math.min(pollIndex++, polledStatuses.length - 1)];
    }
    const body = url.includes("/market/status") ? marketStatus(currentStatus) : historyResponse(currentStatus);

    return {
      ok: true,
      json: async () => body
    };
  });
}

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false
      }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("App", () => {
  it("renders closed market message", async () => {
    vi.stubGlobal("fetch", mockApi("CLOSED"));

    renderApp();
    expect(await screen.findByText("Market is closed")).toBeTruthy();
  });

  it("defaults to the index chart", async () => {
    const fetchMock = mockApi("OPEN");
    vi.stubGlobal("fetch", fetchMock);

    renderApp();
    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => String(input).includes("type=index&symbol=DSEX"))).toBe(true));
    expect(await screen.findByText("DSEX Index")).toBeTruthy();
    expect((screen.getByLabelText("Chart type") as HTMLSelectElement).value).toBe("index");
  });

  it("auto-loads the chart when market status changes from closed to open", async () => {
    let intervalCallback: (() => void) | undefined;
    vi.spyOn(window, "setInterval").mockImplementation((handler) => {
      intervalCallback = handler as () => void;
      return 1 as unknown as NodeJS.Timeout;
    });
    vi.spyOn(window, "clearInterval").mockImplementation(() => undefined);
    const fetchMock = mockApi("CLOSED", ["CLOSED", "OPEN"]);
    vi.stubGlobal("fetch", fetchMock);

    renderApp();
    expect(await screen.findByText("Market is closed")).toBeTruthy();

    intervalCallback?.();
    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => String(input).includes("/market/status"))).toBe(true));
    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => String(input).includes("type=index&symbol=DSEX"))).toBe(true));
  });

  it("auto-hides the chart when market status changes from open to closed", async () => {
    let intervalCallback: (() => void) | undefined;
    vi.spyOn(window, "setInterval").mockImplementation((handler) => {
      intervalCallback = handler as () => void;
      return 1 as unknown as NodeJS.Timeout;
    });
    vi.spyOn(window, "clearInterval").mockImplementation(() => undefined);
    const fetchMock = mockApi("OPEN", ["OPEN", "CLOSED"]);
    vi.stubGlobal("fetch", fetchMock);

    renderApp();
    expect(await screen.findByText("DSEX Index")).toBeTruthy();

    await act(async () => {
      intervalCallback?.();
    });
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([input]) => String(input).includes("/market/status"))).toBe(true)
    );
  });
});
