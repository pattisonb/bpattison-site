import React, { useEffect, useState } from "react";
import "../styles/Home.css";
import linkedInLogo from "../assets/linkedinlogo.png";
import gitHubLogo from "../assets/githublogo.png";

function Home() {
  const [showLinks, setShowLinks] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setShowLinks(true);
    }, 1500);
  }, []);

  return (
    <div className="home container">
        <h1 className="fade-in-text">
          Welcome!
        </h1>

      {showLinks && (
        <div className="links">
          <a href="https://www.linkedin.com/in/brian-pattison/" className="decorated-button fade-in-link" style={{ animationDelay: "0.2s" }} target="_blank">
            <span className="button-image">
              <img src={linkedInLogo} alt="Button Image" />
            </span>
          </a>
          <a href="https://github.com/pattisonb/" className="decorated-button fade-in-link" style={{ animationDelay: "0.4s" }} target="_blank">
            <span className="button-image">
              <img src={gitHubLogo} alt="Button Image" />
            </span>
          </a>
        </div>
      )}
    </div>
  );
}

export default Home;
