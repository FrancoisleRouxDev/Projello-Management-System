import React from "react";
import "./JelloItem.css";

export default function JelloItem() {
    return (
        <div className="JelloItem">
            <div className="ItemNames">
                <h5>Jello Name</h5>
                <p className="Item_ClientName">Client Name</p>
            </div>

            <div className="JelloInfo">
                <div className="Item_Date"> <h5>0000/00/00</h5> </div>
                <div className="Item_Progress">
                  <div className="ProgressBar">
                    <div className="ProgressBar__fill" style={{ width: "50%" }} />
                  </div>
                  <span className="ProgressBar__label">00 / 50 Milesstones Reached</span>
                </div>
                <div className="Item_ActiveWorkers"> <h5>00 Workers</h5> </div>
            </div>
        </div>
    );
}