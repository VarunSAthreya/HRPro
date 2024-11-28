import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"
import { SendHorizontalIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import MessageBox from "../components/MessageBox";
import ChatHeader from "./chat/pages/ChatHeader";
import styles from "./chat/pages/Playground.module.css";

function Thread() {
  
  const lastDivRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");

  const handleSend = (e: any) => {
    e.preventDefault();
    console.log(query);
    setQuery("");
  };


  useEffect(() => {
    if (lastDivRef.current) {
      lastDivRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);
  return (
    <div className={styles.container}>
      <ChatHeader heading="Talent Acquisition" route="" />
      <div className="w-full h-[85vh]c rounded-xl border-border border-1 relative flex flex-col overflow-y-scroll">
        <MessageBox inputType="agent" />
        <MessageBox inputType="user" />
        <MessageBox inputType="agent" />
        <MessageBox inputType="user" />
        <div ref={lastDivRef}></div>
      </div>
      <div
          className={
            styles["textbox-container"]
          }
          style={{ paddingTop: "0.5rem" }}
      >
        {/* <Button
          onClick={(e) => e.preventDefault()}
          variant={"ghost"}
          className=" flex items-center justify-center w-12 h-12 rounded-full"
        >
          <PaperclipIcon size={32} />
        </Button> */}

        <Textarea
          placeholder="Enter your query..."
          value={query}
          className={styles.textbox}
          style={{ height: `36px` }}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button
          onClick={handleSend}
          variant={"ghost"}
          className=" flex items-center justify-center w-12 h-12 rounded-full"
        >
          <SendHorizontalIcon size={32} />
        </Button>
      </div>
    </div>
  );
}

export default Thread;
