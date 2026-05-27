import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./SideNavBar.css";
import BearLogo from "../assets/Logo/Navbar_Logo.svg";
import UserDefaultPfp from "../assets/UserDefaultPfp.svg";
import { createAvatar } from '@dicebear/core';
import { botttsNeutral } from '@dicebear/collection';
import { API_BASE_URL } from "../config";

function getUserInfoFromToken() {
    try {
        const token = localStorage.getItem("token");
        if (!token) return { id: "", name: "Unknown", role: "Unknown" };
        let payloadPart = token.split('.')[1];
        payloadPart = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
        while (payloadPart.length % 4) payloadPart += '=';
        const payload = JSON.parse(atob(payloadPart));
        const id = payload.sub || payload.nameid || payload.id || payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || "";
        const name = payload.FullName || payload.fullName || payload.name || payload.email || "Unknown";
        let role = payload.role || payload.Role || payload.roleName || payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
        if (!role && payload.RoleID) {
            switch (payload.RoleID.toString()) {
                case "1": role = "Admin"; break;
                case "2": role = "Foreman"; break;
                case "3": role = "Worker"; break;
                case "4": role = "Big Boss"; break;
                default: role = `Role ${payload.RoleID}`;
            }
        }
        if (!role) role = "Unknown";
        return { id, name, role };
    } catch (e) {
        return { id: "", name: "Unknown", role: "Unknown" };
    }
}

export default function SideNavBar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { name, role } = getUserInfoFromToken();
    
    const [avatarSeed, setAvatarSeed] = useState<string>("");
    const [avatarBg, setAvatarBg] = useState<string>("");

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem("token");
            if (!token) return;

            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (typeof data.avatarSeed === 'string') setAvatarSeed(data.avatarSeed);
                    if (typeof data.avatarBackground === 'string') setAvatarBg(data.avatarBackground);
                } else {
                    console.warn(`Failed to fetch profile. Status: ${response.status}`);
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
            }
        };

        fetchProfile();
    }, []);

    // Safe guard for avatar generation
    const hasCustomAvatar = !!avatarSeed && !!avatarBg;
    const safeBg = avatarBg && avatarBg.trim() !== "" ? avatarBg : "ffa000";
    const bgHex = safeBg.startsWith('#') ? safeBg : `#${safeBg}`;
    
    // Ensure seed is string for createAvatar
    let avatarSvg: string | null = null;
    
    if (hasCustomAvatar && typeof avatarSeed === 'string') {
        avatarSvg = createAvatar(botttsNeutral, {
            seed: avatarSeed,
            backgroundColor: [bgHex]   // ← Wrap in array
        }).toString();
    }

    return (
        <div className="side-nav-wrapper">
            <div className="side-nav-main">
                <div style={{ height: "100px" }} />
                <div className="pageNavContainer">
                    <div className="side-nav-logo-container">
                        <img src={BearLogo} alt="Projello Logo" className="side-nav-logo" />
                    </div>
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
            </div>
            <div className="side-nav-footer">
                <div
                    className={`userInfo${location.pathname === "/settings" ? " active" : ""}`}
                    onClick={() => navigate("/settings")}
                    tabIndex={0}
                    role="button"
                    style={{ cursor: "pointer" }}
                    onKeyDown={e => { 
                        if (e.key === "Enter" || e.key === " ") {
                            navigate("/settings");
                            e.preventDefault();
                        }
                    }}
                >
                    <div className="ProfilePic">
                        {hasCustomAvatar && avatarSvg ? (
                            <img
                                src={`data:image/svg+xml;utf8,${encodeURIComponent(avatarSvg)}`}
                                alt="User Avatar"
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: "50%",
                                    display: "block",
                                    background: bgHex
                                }}
                            />
                        ) : (
                            <div style={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                background: "#C5D3C9",
                                overflow: "hidden",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}>
                                <img
                                    src={UserDefaultPfp}
                                    alt="Default User Avatar"
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: "50%",
                                        display: "block",
                                        background: "transparent"
                                    }}
                                />
                            </div>
                        )}
                    </div>
                    <div className="UserDetails">
                        <h5>{name}</h5>
                        <p>{role}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}