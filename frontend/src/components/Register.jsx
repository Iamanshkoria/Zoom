
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Register.css";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim() || !username.trim() || !password || !confirmPassword) {
      setError("Please complete all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:8000/api/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            username: username.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to create your account.");
        return;
      }

      setSuccess("Your account has been created successfully.");

      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (err) {
      setError("Couldn't connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <header className="auth-header">
        <Link to="/login" className="auth-brand">
          <span className="auth-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="23" height="23" fill="none">
              <rect
                x="3"
                y="6"
                width="12"
                height="12"
                rx="3"
                fill="currentColor"
              />
              <path
                d="M15 10L21 6.5V17.5L15 14V10Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span>zoom</span>
        </Link>

        <div className="auth-header-right">
          <span>Already registered?</span>
          <Link to="/login" className="auth-header-link">
            Sign in
          </Link>
        </div>
      </header>

      <section className="auth-main">
        <div className="auth-card">
          <div className="auth-heading">
            <p className="auth-overline">GET STARTED</p>
            <h1>Create your account</h1>
            <p className="auth-description">
              A few details and you're ready to connect.
            </p>
          </div>

          <form onSubmit={handleRegister} noValidate>
            <div className="auth-field">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="register-password">Password</label>

              <div className="auth-password">
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="confirm-password">Confirm password</label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Enter your password again"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            {success && (
              <div className="auth-success" role="status">
                {success}
              </div>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? "Creating account…" : "Create account"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="auth-card-footer">
            <span className="auth-status-dot" />
            <span>Your account details stay protected.</span>
          </div>
        </div>
      </section>

      <footer className="auth-footer">
        <span>© {new Date().getFullYear()} Zoom Clone</span>
        <span>Video meetings made simple.</span>
      </footer>
    </main>
  );
}

export default Register;
