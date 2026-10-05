import { Router } from "express";
import { getAllAlumni, getAlumniById } from "../controllers/alumni.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(protect);

router.get("/",    getAllAlumni);
router.get("/:id", getAlumniById);

export default router;
