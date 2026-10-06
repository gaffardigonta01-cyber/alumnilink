import { Router } from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  getThreads,
  getConversation,
  sendMessage,
  acceptRequest,
  declineRequest,
  getRequestsQueue,
} from "../controllers/message.controller.js";

const router = Router();
router.use(protect);

// Message Requests queue & actions (before :partnerId)
router.get("/requests", getRequestsQueue);
router.put("/requests/:partnerId/accept", acceptRequest);
router.post("/requests/:partnerId/accept", acceptRequest);
router.put("/requests/:partnerId/decline", declineRequest);
router.post("/requests/:partnerId/decline", declineRequest);

// Standard conversation routes
router.get("/", getThreads);
router.post("/", sendMessage);
router.get("/:partnerId", getConversation);
router.post("/:partnerId", sendMessage);
router.put("/:partnerId/read", getConversation);

export default router;
