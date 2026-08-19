import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "../styles/Breadcrumbs.css";

const labels = {
  projects: "projects",
  spotify: "music",
  tictactoe: "tic tac toe",
};

//only shows in craigslist mode
const Breadcrumbs = () => {
  const [craigslist, setCraigslist] = useState(
    document.documentElement.getAttribute("data-style") === "craigslist"
  );
  const location = useLocation();

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setCraigslist(
        document.documentElement.getAttribute("data-style") === "craigslist"
      );
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-style"],
    });
    return () => observer.disconnect();
  }, []);

  if (!craigslist) {
    return null;
  }

  const segments = location.pathname.split("/").filter(Boolean);
  const crumbs = [{ label: "brian pattison", to: "/" }];
  let path = "";
  for (const segment of segments) {
    path += "/" + segment;
    crumbs.push({ label: labels[segment] || segment, to: path });
  }

  return (
    <div className="breadcrumbs">
      <div className="container">
        {crumbs.map((crumb, i) => (
          <span key={crumb.to}>
            {i > 0 && <span className="breadcrumb-sep"> &gt; </span>}
            {i === crumbs.length - 1 && crumbs.length > 1 ? (
              <span>{crumb.label}</span>
            ) : (
              <Link to={crumb.to}>{crumb.label}</Link>
            )}
          </span>
        ))}
      </div>
    </div>
  );
};

export default Breadcrumbs;
