
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import NavSidebar from "./components/NavSidebar";
import ScenarioGenerator from "./pages/ScenarioGenerator";
import Index from "./pages/Index";
import ScenarioValidator from "./pages/ScenarioValidator";

function App() {
  return (
    <Router>
      <NavSidebar>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/generator" element={<ScenarioGenerator />} />
          <Route path="/validator" element={<ScenarioValidator />} />
        </Routes>
      </NavSidebar>
    </Router>
  );
}

export default App;
