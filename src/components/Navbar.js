import React, { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  FaGithub,
  FaLinkedinIn,
  FaBars,
  FaTimes,
  FaMoon,
  FaSun,
  FaPeace,
} from "react-icons/fa";
import "../styles/Navbar.css";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Projects", to: "/projects" },
  { label: "Music", to: "/projects/spotify" },
  { label: "Votify", to: "/projects/votify" },
  { label: "Tic Tac Toe", to: "/projects/tictactoe" },
];

const getInitialTheme = () => {
  const set = document.documentElement.getAttribute("data-theme");
  if (set) return set;
  try {
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
  } catch (e) {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const getInitialStyle = () => {
  try {
    return localStorage.getItem("style") || "";
  } catch (e) {
    return "";
  }
};

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);
  const [pageStyle, setPageStyle] = useState(getInitialStyle);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {}
  }, [theme]);

  useEffect(() => {
    if (pageStyle) {
      document.documentElement.setAttribute("data-style", pageStyle);
    } else {
      document.documentElement.removeAttribute("data-style");
    }
    try {
      localStorage.setItem("style", pageStyle);
    } catch (e) {}
  }, [pageStyle]);

  const toggleTheme = () =>
    setTheme((t) => (t === "dark" ? "light" : "dark"));

  const toggleStyle = () =>
    setPageStyle((s) => (s === "craigslist" ? "" : "craigslist"));

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`nav ${scrolled ? "scrolled" : ""}`}>
      <div className="nav-inner container">
        <Link to="/" className="nav-brand" onClick={() => setOpen(false)}>
          <span className="nav-logo">BP</span>
          <span className="nav-name">Brian Pattison</span>
        </Link>

        <nav className={`nav-links ${open ? "open" : ""}`}>
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end
              className={({ isActive }) =>
                "nav-link" + (isActive ? " active" : "")
              }
            >
              {link.label}
            </NavLink>
          ))}

          <div className="nav-socials">
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
          </div>
        </nav>

        <div className="nav-right">
          <button
            className={
              "theme-toggle" + (pageStyle === "craigslist" ? " on" : "")
            }
            onClick={toggleStyle}
            aria-label={
              pageStyle === "craigslist"
                ? "Back to the normal look"
                : "Craigslist mode"
            }
            title={
              pageStyle === "craigslist" ? "Back to normal" : "Craigslist mode"
            }
          >
            <FaPeace />
          </button>

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <FaSun /> : <FaMoon />}
          </button>

          <button
            className="menu-toggle"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
