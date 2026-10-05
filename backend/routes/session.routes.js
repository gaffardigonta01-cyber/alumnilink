import { Router } from "express";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import {
  getSessions, createSession, updateSessionStatus, startSession, joinSession, deleteSession,
} from "../controllers/session.controller.js";

const router = Router();
router.use(protect);

router.get   ("/",           getSessions);
router.post  ("/",           createSession);
router.put   ("/:id/status", updateSessionStatus);
router.put   ("/:id/start",  authorize("alumni"), startSession);
router.put   ("/:id/join",   authorize("student"), joinSession);
router.delete("/:id",        deleteSession);

export default router;
