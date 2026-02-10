import "./App.css";
import Sidebar from "./components/Sidebar";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import { Projects } from "./pages/Projects";
import Spotify from "./pages/Spotify";
import Battlegrounds from "./pages/Battlegrounds";

function App() {
  return (
    <Router>
      <Sidebar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/spotify" element={<Spotify />} />
        <Route path="/projects/battlegrounds" element={<Battlegrounds />} />
      </Routes>
    </Router>
  );
}

export default App;
