import { Router } from "express";
import { signUp, login, forgotPassword, resetPassword } from "../controllers/auth.controller.js";
const router = Router();

router.post("/signup", signUp);
router.post("/login", login);
router.post("/forgot", forgotPassword);
router.post("/reset", resetPassword);

export default router;
