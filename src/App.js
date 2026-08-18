import "./App.css";
import Navbar from "./components/Navbar";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Home from "./pages/Home";
import { Projects } from "./pages/Projects";
import Spotify from "./pages/Spotify";
import TicTacToe from "./pages/TicTacToe";

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container">
        <p>© {year} Brian Pattison</p>
        <div className="footer-links">
          <a
            href="https://github.com/pattisonb/"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/brian-pattison/"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
          <a href="mailto:brian@glendaleanalytics.com">Email</a>
        </div>
      </div>
    </footer>
  );
}

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="page">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/spotify" element={<Spotify />} />
            <Route path="/projects/tictactoe" element={<TicTacToe />} />
            <Route
              path="/projects/music"
              element={<Navigate to="/projects/spotify" replace />}
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
