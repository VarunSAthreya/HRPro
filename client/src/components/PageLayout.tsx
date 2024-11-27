import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import Container from "./Container";
import { Button } from "./ui/button";

function PageLayout({ className = "", children }) {
  const [showSidebar, setShowSidebar] = useState(true);
  return (
    <div className="flex flex-nowrap">
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
                  className={`w-full ${isActive ? "font-bold" : ""}`}
                >
                  Threads
                </Button>
              )}
            </NavLink>
            <NavLink to="/onboarding" className="w-full p-4">
              {({ isActive }) => (
                <Button
                  variant="secondary"
                  className={`w-full ${isActive ? "font-bold" : ""}`}
                >
                  Onboarding
                </Button>
              )}
            </NavLink>
          </div>
        </div>
      )}

      <Container>{children}</Container>
    </div>
  );
}

export default PageLayout;
