import React from "react";
import "./JelloItem.css";
import { useNavigate } from "react-router-dom";

interface JelloItemProps {
    name: string;
    clientName: string;
    date: string;
    progressPercent: number;
    milestonesLabel: string;
    workers: number;
    onClick?: () => void;
}

export default function JelloItem({
    name,
    clientName,
    date,
    progressPercent,
    milestonesLabel,
    workers,
    onClick,
}: JelloItemProps) {
    const navigate = useNavigate();
    return (
        <div
            className="JelloItem clickable"
            onClick={onClick || (() => navigate("/single-view"))}
            tabIndex={0}
            role="button"
            onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") (onClick ? onClick() : navigate("/single-view"));
            }}
        >
            <div className="ItemNames">
                <h5>{name}</h5>
                <p className="Item_ClientName">{clientName}</p>
            </div>

            <div className="JelloInfo">
                <div className="Item_Date"> <h5>{date}</h5> </div>
                <div className="Item_Progress">
                    <div className="ProgressBar">
                        <div className="ProgressBar__fill" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <span className="ProgressBar__label">{milestonesLabel}</span>
                </div>
                <div className="Item_ActiveWorkers"> <h5>{workers} Workers</h5> </div>
            </div>
        </div>
    );
}