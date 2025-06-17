import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { AppError } from "./utils/AppError";
import { errorConverter, errorHandler, notFound } from "./utils/apiError";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import swaggerOptions from "./swaggerOptions";
import routers from './routes/index.routes'

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Serve Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/api/v1", routers);

app.get("/", (_, res: Response) => {
  res.send("Hello World");
});

app.use((req: Request, res: Response, next: NextFunction) => {
  next(new AppError("Route not found", 404));
});

app.use(notFound);
app.use(errorConverter);
app.use(errorHandler);

export default app;
