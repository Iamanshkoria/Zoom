
import { Router } from "express";

import {
    createMeeting,
    joinMeeting
} from "../controllers/meeting.controllers.js";

import auth from "../middleware/auth.js";

const router = Router();

// A valid JWT is required to create a meeting
router.route("/createmeeting").post(auth, createMeeting);

// A valid JWT is required to join a meeting
router.route("/joinmeeting").post(auth, joinMeeting);

export default router;
