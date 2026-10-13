import { Router } from "express";

import {
    Register,
    Login,
    GetUser
} from "../controllers/user.controllers.js";

const router = Router();

router.route("/Register").post(Register);

router.route("/Login").post(Login);

router.route("/me").get(GetUser);

export default router;