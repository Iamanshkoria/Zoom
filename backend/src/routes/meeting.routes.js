import { Router } from "express";
import { createMeeting, joinMeeting } from "../controllers/meeting.controllers.js";

const router = Router();

router.route("/createmeeting").post(createMeeting);
router.route("/joinmeeting").post(joinMeeting)

export default router;