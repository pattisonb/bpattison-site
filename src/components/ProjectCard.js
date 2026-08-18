import React from "react";
import { Link } from "react-router-dom";
import { FaArrowRight, FaArrowUpRightFromSquare } from "react-icons/fa6";
import "./ProjectCard.css";

const ProjectCard = ({ project }) => {
  const { title, blurb, href, internal, tag, icon: Icon, accent } = project;

  const inner = (
    <>
      <div className="pcard__top">
        <span
          className="pcard__icon"
          style={{
            background: `${accent}14`,
            color: accent,
          }}
        >
          <Icon />
        </span>
        <span className="tag">{tag}</span>
      </div>
      <h3 className="pcard__title">{title}</h3>
      <p className="pcard__blurb">{blurb}</p>
      <span className="pcard__cta">
        {internal ? "Explore" : "Visit"}
        {internal ? <FaArrowRight /> : <FaArrowUpRightFromSquare />}
      </span>
    </>
  );

  if (internal) {
    return (
      <Link to={href} className="pcard">
        {inner}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className="pcard"
      target="_blank"
      rel="noopener noreferrer"
    >
      {inner}
    </a>
  );
};

export default ProjectCard;
