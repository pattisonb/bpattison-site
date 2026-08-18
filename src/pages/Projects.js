import React from "react";
import ProjectCard from "../components/ProjectCard";
import { projects } from "../data/projects";
import "../styles/Projects.css";

export const Projects = () => {
  return (
    <div className="projects-page">
      <section className="projects-hero">
        <div className="container">
          <span className="eyebrow">Projects</span>
          <h1 className="projects-hero__title">Things I've built</h1>
          <p className="projects-hero__sub">
            Side projects, data toys, and experiments. A few pull live data and
            run right here on the site; others live in their own homes on the
            web. Poke around.
          </p>
        </div>
      </section>

      <section className="section projects-list">
        <div className="container">
          <div className="projects-grid">
            {projects.map((project) => (
              <ProjectCard key={project.title} project={project} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
