import pino from "pino";
import { config } from "./config.js";

export const logger = pino(
  {
    level: config.LOG_LEVEL,
    redact: ["req.headers.authorization", "OPENAI_API_KEY", "AZURE_OPENAI_API_KEY"]
  },
  pino.destination(2)
);
