import React, { useEffect, useState } from "react";

import CreateMeeting from "./CreateMeeting.jsx";
import JoinMeeting from "./Joinmeeting.jsx";

export default function Home() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("Token");

    const getUser = async () => {
      const response = await fetch("http://localhost:8000/api/me", {
        method: "GET",
        headers: {
          Authorization: token,
        },
      });

      const data = await response.json();

      console.log(data);

      if (response.ok) {
        setUser(data);
      }
    };

    getUser();
  }, []);

  return (
    <div className="container py-5">
      <div className="text-center mb-5">
        <h1 className="fw-bold">Meeting App</h1>

        {user && <p className="text-muted fs-5">Welcome, {user.username}</p>}
      </div>

      <div className="row g-4">
        <div className="col-md-6">
          <CreateMeeting />
        </div>
        <div className="col-md-6">
          <JoinMeeting />
        </div>
      </div>
    </div>
  );
}
