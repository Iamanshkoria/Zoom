
import { Router } from "express";

import {
    Register,
    Login,
    GetUser
} from "../controllers/user.controllers.js";

import auth from "../middleware/auth.js";

const router = Router();

router.route("/Register").post(Register);

router.route("/Login").post(Login);

// JWT authentication required
router.route("/me").get(auth, GetUser);

export default router;
