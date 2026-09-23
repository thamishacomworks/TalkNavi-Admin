import { Link, useLocation } from "react-router-dom";

const menus = [
  { name: "Dashboard", path: "/" },
  { name: "Languages", path: "/languages" },
  { name: "Restaurants", path: "/restaurants" },
  { name: "AI Help", path: "/ai-help" },
  { name: "Transportation", path: "/transportation" },

  // NEW
  { name: "App Updates", path: "/app-updates" },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-64 min-h-screen bg-slate-900 text-white p-5">
      <h2 className="text-2xl font-bold mb-8 text-center">
        Talk Navi
      </h2>

      <div className="space-y-2">
        {menus.map((menu) => (
          <Link
            key={menu.path}
            to={menu.path}
            className={`block rounded-lg px-4 py-3 transition ${
              location.pathname === menu.path
                ? "bg-blue-600"
                : "hover:bg-slate-700"
            }`}
          >
            {menu.name}
          </Link>
        ))}
      </div>
    </div>
  );
}