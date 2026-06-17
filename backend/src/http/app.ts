import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import swaggerUi from "swagger-ui-express";
import { ZodError } from "zod";
import { corsOrigins } from "../config/env.js";
import { logger } from "../config/logger.js";
import { apiRouter, healthRouter } from "../routes/index.js";
import { openApiSpec } from "../swagger/openapi.js";

export function createApp() {
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: corsOrigins, credentials: false }));
  app.use(express.json({ limit: "256kb" }));
  app.use(pinoHttp({ logger }));

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.use(healthRouter);
  app.use("/api", apiRouter);

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ZodError) {
      res.status(422).json({
        error: "Validation failed",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      });
      return;
    }

    const statusCode =
      typeof error === "object" && error !== null && "statusCode" in error ? Number(error.statusCode) : 500;
    const message = error instanceof Error ? error.message : "Unexpected error";
    res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({ error: message });
  });

  return app;
}
