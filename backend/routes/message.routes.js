import { Router } from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { getThreads, getConversation, sendMessage } from "../controllers/message.controller.js";

const router = Router();
router.use(protect);

router.get ("/"              , getThreads);
router.post("/"              , sendMessage);
router.get ("/:partnerId"    , getConversation);
router.post("/:partnerId"    , sendMessage);
router.put ("/:partnerId/read", getConversation);

export default router;
