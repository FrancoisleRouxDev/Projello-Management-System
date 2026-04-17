import React from "react";
import "./dashboard.css";
import BearLogo from "../../assets/Logo/SVG_Logo.svg";
import SearchIcon from "../../assets/Logo/SearchIcon.svg";
import SortArrow from "../../assets/Logo/SortArrow.svg";

export default function DashboardPage() {
  return (
    <div className="dashboard-page">
      <div className="pageHeader">
        <img src={BearLogo} alt="Projello Logo" />
        <h3>Active Jellos</h3>
      </div>
      <div className="filterBar">
        <div className="searchBar">
          <img src={SearchIcon} alt="Search Icon" />
          <input type="text" placeholder="Search projects..." className="searchInput"/>
        </div>
        <div className="sorter" id="AZsorter">
          <h5>Sort (A-Z)</h5>
          <img src={SortArrow} alt="Sort Arrow" />
        </div>
        <div className="sorter" id="prioritySorter">
          <h5>Priority</h5>
          <img src={SortArrow} alt="Sort Arrow" />
        </div>
        <div className="sorter" id="dateSorter">
          <h5>Date</h5>
          <img src={SortArrow} alt="Sort Arrow" />
        </div>
        <div className="sorter" id="progressSorter">
          <h5>Progress</h5>
          <img src={SortArrow} alt="Sort Arrow" />
        </div>
        <div className="sorter" id="activeWorkersSorter">
          <h5>Active Workers</h5>
          <img src={SortArrow} alt="Sort Arrow" />
        </div>
      </div>
    </div>
  );
}