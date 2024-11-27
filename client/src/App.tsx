import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Home from "./pages/Home";
import OnboardingScreen from "./pages/OnboardingScreen";
import Thread from "./pages/Thread";
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/thread/:id" element={<Thread />} />
        <Route path="/onboarding" element={<OnboardingScreen />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;
