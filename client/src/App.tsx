import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Home from "./pages/Home";
import OnboardingScreen from "./pages/OnboardingScreen";
import Thread from "./pages/Thread";
import Playground from "./pages/chat/pages/Playground";
import OnBoarding from "./pages/chat/pages/Onboarding";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/thread/:id" element={<Thread />} />
        <Route path="/onboarding" element={<OnBoarding />} />
        <Route path="/onboarding/chat" element={<Playground />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;
