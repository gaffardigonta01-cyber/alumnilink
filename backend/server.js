import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js";

// Route imports
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import alumniRoutes from "./routes/alumni.routes.js";
import sessionRoutes from "./routes/session.routes.js";
import messageRoutes from "./routes/message.routes.js";
import resourceRoutes from "./routes/resource.routes.js";
import referralRoutes from "./routes/referral.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import jobRoutes from "./routes/job.routes.js";

// Middleware
import { errorHandler, notFound } from "./middlewares/error.middleware.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Core Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Static Files (Uploads)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API Routes
app.use("/api/auth",          authRoutes);
app.use("/api/users",         userRoutes);
app.use("/api/alumni",        alumniRoutes);
app.use("/api/sessions",      sessionRoutes);
app.use("/api/messages",      messageRoutes);
app.use("/api/resources",     resourceRoutes);
app.use("/api/referrals",     referralRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/jobs",          jobRoutes);

// Health Check
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// 404 and Error Handlers (must come last)
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 AlumniLink server running on http://localhost:${PORT}`);
});

export default app;
