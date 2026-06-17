import { Router } from "express";
import { createSimulatedTick } from "../controllers/simulator.controller.js";

export const simulatorRouter = Router();

simulatorRouter.post("/simulate/tick", createSimulatedTick);
