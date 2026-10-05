import { Router } from "express";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import { uploadResourceAttachment } from "../middlewares/upload.middleware.js";
import {
  getResources,
  createResource,
  uploadAttachment,
  downloadResource,
  viewResource,
  toggleSave,
  deleteResource,
} from "../controllers/resource.controller.js";

const router = Router();

// Public / direct view endpoint for reading resources in browser
router.get("/:id/view", viewResource);
router.get("/:id/view.pdf", viewResource);

router.use(protect);

router.get("/", getResources);
router.post("/upload", uploadResourceAttachment.single("file"), uploadAttachment);
router.post("/", authorize("alumni", "admin"), uploadResourceAttachment.single("file"), createResource);
router.post("/:id/download", downloadResource);
router.post("/:id/toggle-save", toggleSave);
router.delete("/:id", authorize("alumni", "admin"), deleteResource);

export default router;
