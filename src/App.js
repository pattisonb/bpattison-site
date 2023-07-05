import './App.css';
import Sidebar from './components/Sidebar';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import { Projects, ProjectsOne, ProjectsTwo, ProjectsThree } from './pages/Projects';
import Spotify from './pages/Spotify';

function App() {
  return (
    <Router>
      <Sidebar />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/projects' element={<Projects />} />
        <Route path='/projects/spotify' element={<Spotify />} />
        <Route path='/projects/projects2' element={<ProjectsTwo />} />
        <Route path='/projects/projects3' element={<ProjectsThree />} />
      </Routes>
    </Router>
  );
}

export default App;
