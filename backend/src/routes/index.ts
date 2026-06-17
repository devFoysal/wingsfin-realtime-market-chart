import { Router } from "express";
import { chartsRouter } from "../modules/market/routes/charts.routes.js";
import { healthRouter } from "./health.routes.js";
import { marketRouter } from "../modules/market/routes/market.routes.js";
import { simulatorRouter } from "../modules/simulator/routes/simulator.routes.js";

export const apiRouter = Router();

apiRouter.use(marketRouter);
apiRouter.use(chartsRouter);
apiRouter.use(simulatorRouter);

export { healthRouter };
