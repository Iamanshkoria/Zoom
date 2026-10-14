
import React, { useEffect, useState } from "react";

import CreateMeeting from "./CreateMeeting.jsx";
import JoinMeeting from "./Joinmeeting.jsx";

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const getUser = async () => {
      const token = localStorage.getItem("Token");

      if (!token) {
        setError("You are not logged in. Please log in first.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("http://localhost:8000/api/me", {
          method: "GET",
          headers: {
            Authorization: token,
          },
        });

        const responseText = await response.text();

        let data;

        try {
          data = JSON.parse(responseText);
        } catch {
          throw new Error(
            `The server returned an invalid response. HTTP status: ${response.status}`
          );
        }

        console.log("API status:", response.status);
        console.log("API response:", data);

        if (!response.ok) {
          throw new Error(
            data.message || `Request failed with status ${response.status}`
          );
        }

        setUser(data);
        setError("");
      } catch (err) {
        console.error("Failed to fetch user:", err);
        setError(err.message || "Unable to load your account.");
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, []);

  return (
    <div className="container py-5">
      <div className="text-center mb-5">
        <h1 className="fw-bold">Meeting App</h1>

        {loading && (
          <p className="text-muted">Loading your account...</p>
        )}

        {!loading && user && (
          <p className="text-muted fs-5">
            Welcome, {user.username}
          </p>
        )}

        {!loading && error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
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