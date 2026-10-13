import { User } from "../model/user.model.js";
import Meeting from "../model/meeting.model.js";

const createMeeting = async (req, res) => {

    const { mtitle, mdate, mtime } = req.body;

    const token = req.headers.authorization;

    const user = await User.findOne({ token });

    const user_id = user._id;

    const meetingCode = Math.random().toString(36).substring(2, 8);

    const meeting = new Meeting({
        user_id: user_id,
        meetingCode: meetingCode,
        title: mtitle,
        date: new Date(`${mdate}T${mtime}`)
    });

    console.log("Username:", user.username);
    console.log("Meeting Title:", mtitle);
    console.log("Meeting Date:", mdate);
    console.log("Meeting Time:", mtime);
    console.log("User ID:", user_id);
    console.log("Meeting Code:", meetingCode);

    await meeting.save();

        res.status(201).json({
    message: "Meeting created successfully",
    meetingCode: meetingCode
});
};

const joinMeeting = async (req, res) => {

    const { meetingCode } = req.body;

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
};

export { createMeeting ,joinMeeting};