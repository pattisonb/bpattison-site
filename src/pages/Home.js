import React from "react";
import { Link } from "react-router-dom";
import { FaGithub, FaLinkedinIn, FaSpotify } from "react-icons/fa";
import { FaArrowRight } from "react-icons/fa6";
import ProjectCard from "../components/ProjectCard";
import { ProjectsData } from "../components/ProjectsData";
import "../styles/Home.css";

function Home() {
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="container hero-inner">
          <h1 className="hero-title">Hi, I'm Brian.</h1>
          <p className="hero-subtitle">
            I work with data, and I build small things on the side.
          </p>
          <p className="hero-text">
            My day job is in analytics. Everything else on this site is stuff I
            made on my own time, usually because I wanted it to exist. There's a
            page that shows what I'm currently playing on Spotify, a couple of
            other experiments, and links to the rest of my work. Have a look
            around.
          </p>

          <div className="hero-buttons">
            <Link to="/projects" className="btn btn-primary">
              See my projects <FaArrowRight />
            </Link>
            <a href="mailto:brian@glendaleanalytics.com" className="btn btn-ghost">
              Email me
            </a>
          </div>

          <div className="hero-links">
            <a
              href="https://github.com/pattisonb/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            >
              <FaGithub />
            </a>
            <a
              href="https://www.linkedin.com/in/brian-pattison/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
            >
              <FaLinkedinIn />
            </a>
            <a
              href="/projects/spotify"
              aria-label="Spotify stats"
            >
              <FaSpotify />
            </a>
          </div>
        </div>
      </section>

      <section className="section" id="projects">
        <div className="container">
          <div className="projects-header">
            <div>
              <h2 className="section-title">Things I've made</h2>
              <p className="section-sub">
                A few projects I've built. Some run right here on the site; the
                rest live elsewhere.
              </p>
            </div>
            <Link to="/projects" className="view-all">
              View all <FaArrowRight />
            </Link>
          </div>

          <div className="projects-grid">
            {ProjectsData.map((project) => (
              <ProjectCard key={project.title} project={project} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
