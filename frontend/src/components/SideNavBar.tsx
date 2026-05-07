import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./SideNavBar.css";


function getUserInfoFromToken() {
    try {
        const token = localStorage.getItem("token");
        if (!token) return { name: "Unknown", role: "Unknown" };
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/').padEnd(token.split('.')[1].length + (4 - token.split('.')[1].length % 4) % 4, '=')));
        const name = payload.FullName || payload.fullName || payload.name || payload.email || "Unknown";
        // Map RoleID numbers to names
        let role = payload.role || payload.Role || payload.roleName || payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
        if (!role && payload.RoleID) {
            switch (payload.RoleID.toString()) {
                case "1": role = "Admin"; break;
                case "2": role = "Foreman"; break;
                case "3": role = "Worker"; break;
                default: role = `Role ${payload.RoleID}`;
            }
        }
        if (!role) role = "Unknown";
        return { name, role };
    } catch {
        return { name: "Unknown", role: "Unknown" };
    }
}

export default function SideNavBar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { name, role } = getUserInfoFromToken();

    return (
        <div className="side-nav-wrapper">
            <div className="pageNavContainer">
                <a
                    className={`pageNavLink${location.pathname === "/dashboard" ? " active" : ""}`}
                    onClick={() => navigate("/dashboard")}
                >
                    <h5>Jello Jobs</h5>
                </a>
                <a
                    className={`pageNavLink${location.pathname === "/history" ? " active" : ""}`}
                    onClick={() => navigate("/history")}
                >
                    <h5>History</h5>
                </a>
                <a
                    className={`pageNavLink${location.pathname === "/management" ? " active" : ""}`}
                    onClick={() => navigate("/management")}
                >
                    <h5>Management</h5>
                </a>
            </div>
            <div className="side-nav-footer">
                <a
                    className={`pageNavLink${location.pathname === "/settings" ? " active" : ""}`}
                    onClick={() => navigate("/settings")}
                >
                    <h5>Settings</h5>
                </a>
                <div className="userInfo">
                    <div className="ProfilePic"></div>
                    <div className="UserDetails">
                        <h5>{name}</h5>
                        <p>{role}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}