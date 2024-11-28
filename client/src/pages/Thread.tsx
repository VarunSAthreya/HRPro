import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"
import {  SendHorizontalIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import MessageBox from "../components/MessageBox";
import ChatHeader from "./chat/pages/ChatHeader";
import styles from "./chat/pages/Playground.module.css";
import { useParams } from "react-router-dom";

function Thread() {
  const threadId = useParams().id;
  const lastDivRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [threadData, setThreadData] = useState<any>(null);
  const [messages, setMessages] = useState<any>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSend = async (e: any) => {
    e.preventDefault();

    const userMessage = {
      messages: [
        {
          role: "user",
          content: query,
        },
      ],
      stream: true,
    };
    setQuery(""); 

    setMessages((prev: any) => [...prev, userMessage.messages[0]]);

    try {
      setIsProcessing(true);
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_API_URL}/v1/thread/${threadData.slug}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userMessage),
        }
      );

      if (!response.body || response.status !== 200) {
        throw new Error("Error during fetch");
      }

      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();

      let assistantMessage = { role: "assistant", content: "" };
      let result = "";

      setMessages((prev: any) => [...prev, assistantMessage]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break; 

        try {
          const parsedValue = JSON.parse(value); 
          if (parsedValue.type !== "status") {
            result += parsedValue.data;
          }
        } catch (e) {
          
          result += value;
        }

        assistantMessage.content = result;
        setMessages((prev: any) => {
          const updatedMessages = [...prev];
          updatedMessages[updatedMessages.length - 1] = { ...assistantMessage }; 
          return updatedMessages;
        });
      }
      setIsProcessing(false);
    } catch (error) {
      console.error("Error during fetch:", error);
      setMessages((prev: any) => [
        ...prev,
        { role: "system", content: "Failed to fetch response. Please try again." },
      ]);
    }
  };

  useEffect(() => {
    const fetchThread = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_API_URL}/v1/thread/${threadId}`
        );
        const thread = await response.json();
        setThreadData(thread.data);
        setMessages(thread.data.messages || []); 
      } catch (error) {
        console.error("Failed to fetch thread:", error);
      }
    };

    fetchThread();
  }, [threadId]);

  useEffect(() => {
    if (lastDivRef.current) {
      lastDivRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div className={styles.container}>
      <ChatHeader heading="Talent Acquisition" route="" />
      <div className="w-full h-[85vh] rounded-xl border-border border-1 relative flex flex-col overflow-y-scroll">
        <MessageBox messages={messages} />
        <div ref={lastDivRef}></div>
      </div>
      {isProcessing && <p className="text-sm text-gray-500">Processing...</p>}
      <div className={styles["textbox-container"]} style={{ paddingTop: "0.5rem" }}>
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
          className="flex items-center justify-center w-12 h-12 rounded-full"
          disabled={isProcessing}
        >
          <SendHorizontalIcon size={32} />
        </Button>
      </div>
    </div>
  );
}

export default Thread;

