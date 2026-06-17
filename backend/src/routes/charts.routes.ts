import { Router } from "express";
import { getChartHistory, streamChartTicks } from "../controllers/charts.controller.js";

export const chartsRouter = Router();

chartsRouter.get("/charts/history", getChartHistory);
chartsRouter.get("/charts/stream", streamChartTicks);
