
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Enter your username and password to continue.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:8000/api/Login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to sign in. Check your credentials.");
        return;
      }

      if (!data.token) {
        setError("The server returned an invalid login response.");
        return;
      }

      localStorage.setItem("Token", data.token);
      navigate("/home");
    } catch (err) {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <header className="auth-header">
        <Link to="/login" className="auth-brand" aria-label="Zoom home">
          <span className="auth-brand-mark" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="23"
              height="23"
              fill="none"
            >
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
          <span>New to Zoom?</span>
          <Link to="/register" className="auth-header-link">
            Create account
          </Link>
        </div>
      </header>

      <section className="auth-main">
        <div className="auth-card">
          <div className="auth-heading">
            <p className="auth-overline">YOUR WORKSPACE</p>
            <h1>Sign in</h1>
            <p className="auth-description">
              Welcome back. Enter your details to continue.
            </p>
          </div>

          <form onSubmit={handleLogin} noValidate>
            <div className="auth-field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                aria-invalid={Boolean(error)}
              />
            </div>

            <div className="auth-field">
              <div className="auth-label-row">
                <label htmlFor="password">Password</label>
              </div>

              <div className="auth-password">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(error)}
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

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="auth-card-footer">
            <span className="auth-status-dot" />
            <span>Secure account access</span>
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

export default Login;
