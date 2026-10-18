
import { useState } from "react";
import Meetingroom from "./Meetingroom.jsx";

function JoinMeeting() {
    const [meetingCode, setMeetingCode] = useState("");
    const [meeting, setMeeting] = useState(null);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleJoinMeeting = async (e) => {
        e.preventDefault();

        setMessage("");
        setMeeting(null);

        const code = meetingCode.trim();

        if (!code) {
            setMessage("Please enter a meeting code.");
            return;
        }

        const token = localStorage.getItem("Token");

        if (!token) {
            setMessage("Authentication token not found. Please log in again.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                "http://localhost:8000/api/joinmeeting",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        meetingCode: code
                    })
                }
            );

            const data = await response.json();

            console.log("Join meeting status:", response.status);
            console.log("Join meeting response:", data);

            if (!response.ok) {
                if (response.status === 401) {
                    setMessage(
                        data.message ||
                        "Authentication failed. Please log in again."
                    );
                } else {
                    setMessage(
                        data.message ||
                        "Unable to join meeting."
                    );
                }

                return;
            }

            setMeeting(data);
        } catch (error) {
            console.error("Join meeting error:", error);
            setMessage("Unable to connect to the server. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card shadow-sm border-0 h-100">
            <div className="card-body p-4">
                <h3 className="card-title mb-3">
                    Join Meeting
                </h3>

                <p className="text-muted">
                    Enter a meeting code to join an existing meeting.
                </p>

                <form onSubmit={handleJoinMeeting}>
                    <div className="mb-3">
                        <label
                            htmlFor="meetingCode"
                            className="form-label"
                        >
                            Meeting Code
                        </label>

                        <input
                            id="meetingCode"
                            type="text"
                            className="form-control"
                            placeholder="Enter meeting code"
                            value={meetingCode}
                            onChange={(e) => {
                                setMeetingCode(e.target.value);
                                setMessage("");
                            }}
                            required
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-success w-100"
                        disabled={loading}
                    >
                        {loading ? "Joining..." : "Join Meeting"}
                    </button>
                </form>

                {message && (
                    <div
                        className="alert alert-danger mt-3"
                        role="alert"
                    >
                        {message}
                    </div>
                )}

                {meeting && (
                    <div className="mt-4">
                        <div className="alert alert-success">
                            Successfully joined meeting!
                            <div className="mt-1">
                                Meeting Code: {meeting.meetingCode}
                            </div>
                        </div>

                        <Meetingroom
                            meetingCode={meeting.meetingCode || meetingCode.trim()}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default JoinMeeting;