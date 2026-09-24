import { useState } from "react";
import "./index.css";

import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Tablets from "./pages/Tablets";
import Languages from "./pages/Languages";
import AppUpdates from "./pages/AppUpdates";
import Emergency from "./pages/Emergency";

const PAGES = {
  dashboard: { title: "Dashboard", subtitle: "Overview" },
  tablets: { title: "Tablets", subtitle: "Online / offline device status" },
  languages: { title: "Languages", subtitle: "Language management" },
  "app-updates": { title: "App Updates", subtitle: "Publish APK to tablets" },
  emergency: { title: "Emergency", subtitle: "AI Help emergency content" },
};

function LoginScreen({ email, password, setEmail, setPassword, onSubmit }) {
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo">TN</div>
        <h1>Talk Navi</h1>
        <p className="login-subtitle">Admin Panel</p>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login-button">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentPage, setCurrentPage] = useState("dashboard");

  const handleLogin = (e) => {
    e.preventDefault();
    if (email && password) {
      setLoggedIn(true);
    }
  };

  const handleLogout = () => {
    setLoggedIn(false);
    setCurrentPage("dashboard");
    setPassword("");
  };

  if (!loggedIn) {
    return (
      <LoginScreen
        email={email}
        password={password}
        setEmail={setEmail}
        setPassword={setPassword}
        onSubmit={handleLogin}
      />
    );
  }

  const meta = PAGES[currentPage] || PAGES.dashboard;

  return (
    <div className="admin-layout">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
      />

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>{meta.title}</h1>
            <p>{meta.subtitle}</p>
          </div>

          <div className="admin-profile">
            <div className="profile-avatar">A</div>
            <div>
              <strong>Administrator</strong>
              <span>{email || "Admin"}</span>
            </div>
          </div>
        </header>

        {currentPage === "dashboard" && (
          <Dashboard onNavigate={setCurrentPage} />
        )}
        {currentPage === "tablets" && <Tablets />}
        {currentPage === "languages" && <Languages />}
        {currentPage === "app-updates" && <AppUpdates />}
        {currentPage === "emergency" && <Emergency />}
      </main>
    </div>
  );
}

export default App;
