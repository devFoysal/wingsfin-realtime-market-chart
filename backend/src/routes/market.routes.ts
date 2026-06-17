import { Router } from "express";
import { getInstruments, getMarketStatus } from "../controllers/market.controller.js";

export const marketRouter = Router();

marketRouter.get("/market/status", getMarketStatus);
marketRouter.get("/instruments", getInstruments);
