/* This TypeScript code snippet is setting up routes for a user resource using the Express framework.
Here's a breakdown of what each part does: */
import { Router } from "express";
import { me, updateMe, deleteMe, changePassword } from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/auth.js";
const router = Router();

router.get("/me", requireAuth, me);
router.put("/me", requireAuth, updateMe);
router.delete("/me", requireAuth, deleteMe);

// ✅ cambiar contraseña autenticado
router.put("/password", requireAuth, changePassword);

export default router;
