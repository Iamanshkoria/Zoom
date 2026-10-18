
import { User } from "../model/user.model.js";
import Meeting from "../model/meeting.model.js";

const createMeeting = async (req, res) => {
    try {
        const { mtitle, mdate, mtime } = req.body;

        if (!mtitle || !mdate || !mtime) {
            return res.status(400).json({
                message: "Meeting title, date, and time are required"
            });
        }

        // The auth middleware should set this after verifying the JWT
        if (!req.userId) {
            return res.status(401).json({
                message: "Authenticated user ID is missing"
            });
        }

        const user = await User.findById(req.userId);

        if (!user) {
            console.error("User ID from JWT not found:", req.userId);

            return res.status(404).json({
                message: "User not found for the authenticated token"
            });
        }

        const meetingCode = Math.random()
            .toString(36)
            .substring(2, 8);

        const meeting = new Meeting({
            user_id: user._id,
            meetingCode,
            title: mtitle,
            date: new Date(`${mdate}T${mtime}`)
        });

        await meeting.save();

        return res.status(201).json({
            message: "Meeting created successfully",
            meetingCode
        });
    } catch (error) {
        console.error("CREATE MEETING ERROR:", error);

        return res.status(500).json({
            message: "Failed to create meeting"
        });
    }
};

const joinMeeting = async (req, res) => {
    try {
        const { meetingCode } = req.body;

        if (!meetingCode) {
            return res.status(400).json({
                message: "Meeting code is required"
            });
        }

        const meeting = await Meeting.findOne({ meetingCode });

        if (!meeting) {
            return res.status(404).json({
                message: "Meeting not found"
            });
        }

        return res.status(200).json({
            message: "Meeting found",
            meetingCode: meeting.meetingCode,
            title: meeting.title,
            date: meeting.date
        });
    } catch (error) {
        console.error("JOIN MEETING ERROR:", error);

        return res.status(500).json({
            message: "Failed to join meeting"
        });
    }
};

export { createMeeting, joinMeeting };
