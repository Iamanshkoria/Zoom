import { useState } from "react";

function CreateMeeting() {

    const [mtitle, setmtitle] = useState("");
    const [mdate, setmdate] = useState("");
    const [mtime, setmmeeting] = useState("");
    const [meetingCode, setMeetingCode] = useState("");

    const handleCreateMeeting = async (e) => {

        e.preventDefault();

        const token = localStorage.getItem("Token");

        const response = await fetch(
            "http://localhost:8000/api/createmeeting",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token
                },
                body: JSON.stringify({
                    mtitle: mtitle,
                    mdate: mdate,
                    mtime: mtime
                })
            }
        );

        const data = await response.json();

        console.log(data);

        if (response.ok) {
            setMeetingCode(data.meetingCode);
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

                <form onSubmit={handleCreateMeeting}>

                    <div className="mb-3">
                        <label className="form-label">
                            Meeting Title
                        </label>

                        <input
                            type="text"
                            className="form-control"
                            placeholder="Enter meeting title"
                            value={mtitle}
                            onChange={(e) => setmtitle(e.target.value)}
                            required
                        />
                    </div>

                    <div className="row">

                        <div className="col-md-6 mb-3">

                            <label className="form-label">
                                Date
                            </label>

                            <input
                                type="date"
                                className="form-control"
                                value={mdate}
                                onChange={(e) => setmdate(e.target.value)}
                                required
                            />

                        </div>

                        <div className="col-md-6 mb-3">

                            <label className="form-label">
                                Time
                            </label>

                            <input
                                type="time"
                                className="form-control"
                                value={mtime}
                                onChange={(e) => setmmeeting(e.target.value)}
                                required
                            />

                        </div>

                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary w-100"
                    >
                        Create Meeting
                    </button>

                </form>

                {meetingCode && (
                    <div className="alert alert-success mt-4 mb-0">

                        <strong>Meeting Created!</strong>

                        <div className="mt-2">
                            Meeting Code:
                        </div>

                        <h4 className="mb-0">
                            {meetingCode}
                        </h4>

                    </div>
                )}

            </div>

        </div>
    );
}

export default CreateMeeting;