import http from "http";
import app from "./app";
import { config } from "./config/env";
import logger from "./config/logger";
import connectDB from "./config/db";

// Create Server
const server = http.createServer(app);

// Start Server
connectDB();
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
});
