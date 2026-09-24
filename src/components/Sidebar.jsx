const MENUS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "tablets", label: "Tablets" },
  { id: "languages", label: "Languages" },
  { id: "app-updates", label: "App Updates" },
  { id: "emergency", label: "Emergency" },
];

export default function Sidebar({ currentPage, onNavigate, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">TN</div>
        <div>
          <h2>Talk Navi</h2>
          <span>Admin Panel</span>
        </div>
      </div>

      <nav>
        {MENUS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-item ${currentPage === item.id ? "active" : ""}`}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <button type="button" className="logout-button" onClick={onLogout}>
        Logout
      </button>
    </aside>
  );
}
