import React from "react";
import "./JelloItem.css";
import { useNavigate } from "react-router-dom";

interface JelloItemProps {
    name: string;
    clientName: string;
    dueDate: string;
    workers: number;
    onClick?: () => void;
}

const formatDueDate = (value: string) => {
    if (!value) return "No due date";
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

export default function JelloItem({
    name,
    clientName,
    dueDate,
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
                <div className="Item_Date"> <h5>{formatDueDate(dueDate)}</h5> </div>
                <div className="Item_ActiveWorkers"> <h5>{workers} Workers</h5> </div>
            </div>
        </div>
    );
}