import express from "express";

import healthRouter from "./routes/healthRoutes.js";

const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use("/health", healthRouter);

export default app;
