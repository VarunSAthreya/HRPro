import { useEffect, useRef, useState } from "react";
// import { useParams } from "react-router-dom";
// import { AgentMessage } from "../../../pages/chat/utils/constants";
// import Message from "./Message";
import styles from "./Playground.module.css";
import ChatHeader from "./ChatHeader";
import { Textarea } from "@/components/ui/textarea"
import { SendHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast"
import MessageBox from "@/components/MessageBox";

const Playground = () => {
  // const params = useParams<{ agent_id: string }>();
  const { toast } = useToast();

  const [messages, setMessages] = useState<any>([]);
  const [status, setStatus] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  // const [error, setError] = useState<string>("");
  const [isDataLoading, setIsDataLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(30);

  const MAX_HEIGHT = 7 * 24; // Assuming 24px line height
  // Auto-resize the textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        MAX_HEIGHT
      )}px`;
    }
  }, [prompt]);

  // Auto-scroll to the bottom of the message list when new messages arrive
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Focus on the textarea after the message stream is finished
  useEffect(() => {
    if (!isDataLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isDataLoading]);

  const handleKeyDown = (event: any) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (prompt.trim() === "") return;

    const userMessage = {
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      stream: true, // Enable streaming
    };

    setIsDataLoading(true);
    setPrompt("");
    setMessages((prev: any) => [...prev, userMessage.messages[0]]);

    try {
      setStatus("running");
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_API_URL}/v1/rag/agent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            'ngrok-skip-browser-warning': 'true',
            // You can also add a custom User-Agent here
            'User-Agent': 'MyCustomUserAgent'
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
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev: any) => [
        ...prev,
        { role: "system", content: "Failed to fetch response. Please try again." },
      ]);
      toast({
        title: "Encountered an error",
        description: `${error}`,
      });
    } finally {
      setIsDataLoading(false);
      setStatus("");
    }
  };


  return (
    <div className={styles.container}>
      <ChatHeader heading="Employee OnBoarding" route="onboarding" />
      <div className={styles["message-container"]}>
        {messages.length !== 0 ? (
          <>
            {/* {messages.map((message:any, index:number) => (
                <Message key={`${message.role}_${index}`} message={message} />
              ))} */}
            <MessageBox messages={messages} />
          </>
        ) : (
          <div className={styles["no-messages"]}>
            Start a conversation with the agent:
          </div>
        )}
        <div ref={messageEndRef} />
      </div>

     {/* {status && <div className={styles["status-message"]}>{status}</div>} */}
      {isDataLoading && <p className="text-sm text-gray-500 ml-6">Processing...</p>} 
      <div
        className={
          styles["textbox-container"]
        }
        style={status ? { paddingTop: "0.5rem" } : {}}
      >
        <Textarea
          ref={textareaRef}
          placeholder="Type your message here..."
          className={styles.textbox}
          style={{ height: `${height}px !important`, padding: "1rem" }}
          onChange={(e) => {
            setHeight(e.target.scrollHeight);
            setPrompt(e.target.value);
          }}
          rows={2}
          value={prompt}
          disabled={isDataLoading}
          onKeyDown={handleKeyDown}
        />
        <Button
          className={styles["send-button"]}
          variant={"ghost"}
          onClick={handleSubmit}
          disabled={isDataLoading || prompt.trim().length === 0}
        >
          <SendHorizontalIcon size={32} />
        </Button>
      </div>
    </div>
  );
};

export default Playground;
