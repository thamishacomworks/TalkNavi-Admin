import { useState } from "react";
import "./index.css";

import Dashboard from "./pages/Dashboard";
import Languages from "./pages/Languages";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [currentPage, setCurrentPage] =
    useState("dashboard");

  const handleLogin = (e) => {
    e.preventDefault();

    if (email && password) {
      setLoggedIn(true);
    }
  };

  if (!loggedIn) {
    return (
      <div className="login-page">

        <div className="login-card">

          <div className="logo">
            TN
          </div>

          <h1>Talk Navi</h1>

          <p className="login-subtitle">
            Admin Panel
          </p>

          <form onSubmit={handleLogin}>

            <div className="form-group">

              <label>
                Email
              </label>

              <input
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
              />

            </div>

            <div className="form-group">

              <label>
                Password
              </label>

              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                required
              />

            </div>

            <button
              type="submit"
              className="login-button"
            >
              Sign In
            </button>

          </form>

        </div>

      </div>
    );
  }

  return (
    <div className="admin-layout">

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-logo">
            TN
          </div>

          <div>
            <h2>Talk Navi</h2>

            <span>
              Admin Panel
            </span>
          </div>

        </div>

        <nav>

          <button
            className={`nav-item ${
              currentPage === "dashboard"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setCurrentPage("dashboard")
            }
          >
            Dashboard
          </button>

          <button
            className={`nav-item ${
              currentPage === "languages"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setCurrentPage("languages")
            }
          >
            Languages
          </button>

          <button className="nav-item">
            Speakers
          </button>

          <button className="nav-item">
            AI Help
          </button>

          <button className="nav-item">
            Settings
          </button>

        </nav>

        <button
          className="logout-button"
          onClick={() => {
            setLoggedIn(false);
            setCurrentPage("dashboard");
          }}
        >
          Logout
        </button>

      </aside>

      <main className="main-content">

        <header className="topbar">

          <div>
            <h1>
              {currentPage === "dashboard"
                ? "Dashboard"
                : "Language Management"}
            </h1>

            <p>
              Talk Navi Administration
            </p>
          </div>

          <div className="admin-profile">

            <div className="profile-avatar">
              A
            </div>

            <div>
              <strong>
                Administrator
              </strong>

              <span>
                Admin
              </span>
            </div>

          </div>

        </header>

        {currentPage === "dashboard" && (
          <Dashboard />
        )}

        {currentPage === "languages" && (
          <Languages />
        )}

      </main>

    </div>
  );
}

export default App;