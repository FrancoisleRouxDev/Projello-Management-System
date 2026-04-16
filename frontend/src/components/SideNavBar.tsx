import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./SideNavBar.css";

export default function SideNavBar() {
    const navigate = useNavigate();
    const location = useLocation();

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
                        <h5>John Doe</h5>
                        <p>Owner</p>
                </div>
            </div>
        </div>
    </div>
    )
}