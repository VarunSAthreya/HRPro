import { BotMessageSquare, PanelLeftClose, PanelLeftOpen, Send } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import Container from "./Container";
import { Button } from "./ui/button";
import './index.css'

function PageLayout(props: { className?: string; children: React.ReactNode }) {
  const [showSidebar, setShowSidebar] = useState(true);
  return (
    <div className="flex flex-nowrap h-screen overflow-hidden">
      <PanelLeftOpen
        size={24}
        className="fixed top-[1rem] left-[1rem] cursor-pointer z-10"
        onClick={() => setShowSidebar(!showSidebar)}
      />
      {showSidebar && (
        <div className={`h-screen md:w-[400px]`}>
          <div className="bg-foreground flex items-start justify-center flex-col h-full w-full">
            <PanelLeftClose
              size={24}
              className="fixed top-[1rem] left-[1rem] cursor-pointer z-50  text-white"
              onClick={() => setShowSidebar(!showSidebar)}
            />
            <NavLink to="/" className={`w-full p-4 mb-4`}>
              {({ isActive }) => (
                <Button
                  variant="secondary"
                  className={`w-full ${isActive ? "font-bold threads-btn-active" : "inactive-panel-btn"}`}
                >
                 <BotMessageSquare /> Threads
                </Button>
              )}
            </NavLink>
            <NavLink to="/onboarding" className="w-full p-4">
              {({ isActive }) => (
                <Button
                  variant="secondary"
                  className={`w-full ${isActive ? "font-bold onboarding-btn-active" : "inactive-panel-btn"}`}
                >
                  <Send />Onboarding
                </Button>
              )}
            </NavLink>
          </div>
        </div>
      )}

      <Container>{props.children}</Container>
    </div>
  );
}

export default PageLayout;
