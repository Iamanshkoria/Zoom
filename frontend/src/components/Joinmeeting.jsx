
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
    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:8000/api/joinmeeting",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            meetingCode: meetingCode.trim(),
          }),
        }
      );

      const data = await response.json();

      console.log("Join meeting response:", data);

      if (response.ok) {
        setMeeting(data);
      } else {
        setMessage(data.message || "Unable to join meeting.");
      }
    } catch (error) {
      console.error("Join meeting error:", error);
      setMessage("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card shadow-sm border-0 h-100">
      <div className="card-body p-4">
        <h3 className="card-title mb-3">Join Meeting</h3>

        <p className="text-muted">
          Enter a meeting code to join an existing meeting.
        </p>

        <form onSubmit={handleJoinMeeting}>
          <div className="mb-3">
            <label className="form-label">Meeting Code</label>

            <input
              type="text"
              className="form-control"
              placeholder="Enter meeting code"
              value={meetingCode}
              onChange={(e) => setMeetingCode(e.target.value)}
              required
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
          <div className="alert alert-danger mt-3">
            {message}
          </div>
        )}

        {meeting && (
          <Meetingroom meetingCode={meeting.meetingCode} />
        )}
      </div>
    </div>
  );
}

export default JoinMeeting;