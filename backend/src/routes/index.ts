import { Router } from "express";
import { chartsRouter } from "./charts.routes.js";
import { healthRouter } from "./health.routes.js";
import { marketRouter } from "./market.routes.js";
import { simulatorRouter } from "./simulator.routes.js";

export const apiRouter = Router();

apiRouter.use(marketRouter);
apiRouter.use(chartsRouter);
apiRouter.use(simulatorRouter);

export { healthRouter };
