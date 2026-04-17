import React, { useState, useEffect } from "react";
import "./settings.css";

export default function SettingsPage() {
  // Persist theme in localStorage
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div>
      <h2>Settings Page</h2>
      <div style={{ marginTop: 32 }}>
        <label className="theme-switch">
          <input
            type="checkbox"
            checked={theme === "dark"}
            onChange={e => setTheme(e.target.checked ? "dark" : "light")}
          />
          <span className="slider"></span>
          <span className="theme-label">{theme === "dark" ? "Dark" : "Light"} Mode</span>
        </label>
      </div>
    </div>
  );
}