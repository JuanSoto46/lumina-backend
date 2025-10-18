/* This TypeScript code snippet is setting up a router using the Express framework. It imports the
`Router` class from the Express package and functions `signUp`, `login`, `forgotPassword`, and
`resetPassword` from the `auth.controller.js` file located in the controllers directory. */
import { Router } from "express";
import { signUp, login, forgotPassword, resetPassword } from "../controllers/auth.controller.js";
const router = Router();

router.post("/signup", signUp);
router.post("/login", login);
router.post("/forgot", forgotPassword);
router.post("/reset", resetPassword);

export default router;
