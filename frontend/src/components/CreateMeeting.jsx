
import { useState } from "react";

function CreateMeeting() {
    const [mtitle, setMtitle] = useState("");
    const [mdate, setMdate] = useState("");
    const [mtime, setMtime] = useState("");
    const [meetingCode, setMeetingCode] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleCreateMeeting = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");
        setMeetingCode("");

        const title = mtitle.trim();

        if (!title || !mdate || !mtime) {
            setError("Please fill in all fields.");
            return;
        }

        const token = localStorage.getItem("Token");

        if (!token) {
            setError("Authentication token not found. Please log in again.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                "http://localhost:8000/api/createmeeting",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        mtitle: title,
                        mdate: mdate,
                        mtime: mtime
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    setError(
                        data.message ||
                        "Authentication failed. Please log in again."
                    );
                    return;
                }

                setError(
                    data.message ||
                    `Failed to create meeting (${response.status}).`
                );
                return;
            }

            if (!data.meetingCode) {
                setError("Meeting created, but no meeting code was returned.");
                return;
            }

            setMeetingCode(data.meetingCode);
            setSuccess("Meeting created successfully!");

            setMtitle("");
            setMdate("");
            setMtime("");
        } catch (err) {
            console.error("Create meeting error:", err);
            setError("Unable to connect to the server. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card shadow-sm border-0 h-100">
            <div className="card-body p-4">
                <h3 className="card-title mb-3">
                    Create Meeting
                </h3>

                <p className="text-muted">
                    Create a new meeting and share the meeting code.
                </p>

                {error && (
                    <div className="alert alert-danger" role="alert">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="alert alert-success" role="status">
                        {success}
                    </div>
                )}

                <form onSubmit={handleCreateMeeting}>
                    <div className="mb-3">
                        <label
                            htmlFor="meetingTitle"
                            className="form-label"
                        >
                            Meeting Title
                        </label>

                        <input
                            id="meetingTitle"
                            type="text"
                            className="form-control"
                            placeholder="Enter meeting title"
                            value={mtitle}
                            onChange={(e) => setMtitle(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label
                                htmlFor="meetingDate"
                                className="form-label"
                            >
                                Date
                            </label>

                            <input
                                id="meetingDate"
                                type="date"
                                className="form-control"
                                value={mdate}
                                onChange={(e) => setMdate(e.target.value)}
                                min={new Date().toLocaleDateString("en-CA")}
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="col-md-6 mb-3">
                            <label
                                htmlFor="meetingTime"
                                className="form-label"
                            >
                                Time
                            </label>

                            <input
                                id="meetingTime"
                                type="time"
                                className="form-control"
                                value={mtime}
                                onChange={(e) => setMtime(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary w-100"
                        disabled={loading}
                    >
                        {loading ? "Creating Meeting..." : "Create Meeting"}
                    </button>
                </form>

                {meetingCode && (
                    <div className="alert alert-success mt-4 mb-0">
                        <strong>Meeting Created!</strong>

                        <div className="mt-2">
                            Meeting Code:
                        </div>

                        <h4 className="mb-3">{meetingCode}</h4>

                        <button
                            type="button"
                            className="btn btn-outline-success btn-sm"
                            onClick={() => {
                                navigator.clipboard.writeText(meetingCode);
                            }}
                        >
                            Copy Meeting Code
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CreateMeeting;