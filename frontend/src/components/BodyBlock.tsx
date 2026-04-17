import React from "react";
import "./BodyBlock.css";

export default function BodyBlock({ children }: { children: React.ReactNode }) {
  return <div className="body-block">
    {children}
    </div>;
}