import { Router } from "express";
import {
  getProfile,
  updateProfile,
  changePassword,
  uploadAvatar,
} from "../controllers/user.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { uploadAvatarAttachment } from "../middlewares/upload.middleware.js";

const router = Router();

// All user routes require authentication
router.use(protect);

router.get ("/profile",         getProfile);
router.put ("/profile",         updateProfile);
router.post("/avatar",          uploadAvatarAttachment.single('avatar'), uploadAvatar);
router.put ("/change-password", changePassword);

export default router;
