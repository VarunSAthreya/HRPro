import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaperclipIcon, SendHorizontalIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import MessageBox from "../components/MessageBox";

function Thread() {
  const lastDivRef = useRef(null);
  const params = useParams();
  useEffect(() => {
    if (lastDivRef.current) {
      lastDivRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);
  return (
    <PageLayout className="bg-off-white overflow-hidden">
      <div className="bg-background w-full h-[85vh] shadow-lg rounded-xl border-border border-1 relative flex flex-col overflow-y-scroll">
        <MessageBox inputType="agent" />
        <MessageBox inputType="user" />
        <MessageBox inputType="agent" />
        <MessageBox inputType="user" />
        <div ref={lastDivRef}></div>
      </div>
      <div className="w-full bg-background flex flex-nowrap items-center justify-center shadow-lg rounded-xl border-border border-1 mt-4 py-2">
        <Button
          onClick={(e) => e.preventDefault()}
          variant={"ghost"}
          className=" flex items-center justify-center w-12 h-12 rounded-full"
        >
          <PaperclipIcon size={32} />
        </Button>

        <Input
          placeholder="Enter your query..."
          value=""
          type="text"
          className="rounded-md outline-none border-none bg-background py-6"
        />
        <Button
          onClick={(e) => e.preventDefault()}
          variant={"ghost"}
          className=" flex items-center justify-center w-12 h-12 rounded-full"
        >
          <SendHorizontalIcon size={32} />
        </Button>
      </div>
    </PageLayout>
  );
}

export default Thread;
