import { Router } from "express";
import { register, login, getMe, logout, forgotPassword, resetPassword } from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { validateRegister, validateLogin } from "../middlewares/validate.middleware.js";

const router = Router();

router.post("/register", validateRegister, register);
router.post("/login",    validateLogin,    login);
router.get ("/me",       protect,          getMe);
router.post("/logout",   protect,          logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password",  resetPassword);

export default router;
