import React from "react";
import { Link } from "react-router-dom";
import { FaArrowRight, FaArrowUpRightFromSquare } from "react-icons/fa6";
import "../styles/ProjectCard.css";

const ProjectCard = ({ project }) => {
  const { title, blurb, href, internal, tag, icon: Icon, accent } = project;

  const inner = (
    <>
      <div className="project-card-top">
        <span
          className="project-icon"
          style={{
            background: `${accent}14`,
            color: accent,
          }}
        >
          <Icon />
        </span>
        <span className="tag">{tag}</span>
      </div>
      <h3 className="project-title">{title}</h3>
      <p className="project-blurb">{blurb}</p>
      <span className="project-link">
        {internal ? "Explore" : "Visit"}
        {internal ? <FaArrowRight /> : <FaArrowUpRightFromSquare />}
      </span>
    </>
  );

  if (internal) {
    return (
      <Link to={href} className="project-card">
        {inner}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className="project-card"
      target="_blank"
      rel="noopener noreferrer"
    >
      {inner}
    </a>
  );
};

export default ProjectCard;
