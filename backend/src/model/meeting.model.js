import mongoose, { Schema } from "mongoose";

const meetingSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        required: true
    },

    meetingCode: {
        type: String,
        required: true,
        unique: true
    },

    title: {
        type: String,
        required: true
    },

    date: {
        type: Date,
        required: true
    }
});

const Meeting = mongoose.model("Meeting", meetingSchema);

export default Meeting;