import { Router } from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { uploadReferralAttachment } from "../middlewares/upload.middleware.js";
import {
  getReferrals,
  createReferral,
  updateReferralStatus,
  uploadAttachment,
  downloadAttachment,
} from "../controllers/referral.controller.js";

const router = Router();
router.use(protect);

router.get("/", getReferrals);
router.post("/", createReferral);
router.post("/upload", uploadReferralAttachment.single("file"), uploadAttachment);
router.get("/download/:filename", downloadAttachment);
router.put("/:id/status", updateReferralStatus);

export default router;
