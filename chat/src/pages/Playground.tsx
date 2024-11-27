import { Button, Icon } from "@contentstack/venus-components";
import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { showNotification } from "../utils/index";
import { AgentMessage } from "../utils/constants";
import Message from "./Message";
import styles from "./Playground.module.css";
import ChatHeader from "./ChatHeader";

const Playground = () => {
  const params = useParams<{ agent_id: string }>();

  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [status, setStatus] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  const [error, setError] = useState<string>("");
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

  // Show error notification if an error occurs
  useEffect(() => {
    if (error.length > 0) {
      showNotification(error, "error");
      setError("");
    }
  }, [error]);

  const handleKeyDown = (event: any) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (prompt.trim() === "") return;

    const newMessage: AgentMessage = {
      role: "user",
      content: prompt.trim(),
    };
    setIsDataLoading(true);
    setPrompt("");
    setMessages((prev) => [...prev, newMessage]);

    try {
      //   const response =
      //   await fetch(
      //     `${process.env.AUTOMATION_API}/run/agents/${params.agent_id}`,
      //     {
      //       method: 'POST',
      //       headers: apiHeaders(),
      //       body: JSON.stringify({
      //         messages: [...messages, newMessage],
      //         stream: true
      //       })
      //     }
      //   );

      //   if (!response.body) {
      //     throw new Error('No response body');
      //   }

      //   const reader = response.body
      //     .pipeThrough(new TextDecoderStream())
      //     .getReader();

      //   while (true) {
      //     const { value, done } = {value: '{"type":"status","data":"Running"}', done: false};
      //     // await reader.read();
      //     if (done) break;
      //     if (value) {
      //       try {
      //         const parsedValue = JSON.parse(value);
      //         console.log('Parsed Value:', parsedValue);
      //         if (parsedValue.type == 'status') {
      //           setStatus(parsedValue.data);
      //         } else if (parsedValue.type == 'error') {
      //           setError(parsedValue.data);
      //         } else {
      //           setMessages((prev) => {
      //             const lastMessage = prev[prev.length - 1];
      //             if (lastMessage.role === 'assistant') {
      //               lastMessage.content += value;
      //             } else {
      //               prev.push({ role: 'assistant', content: value });
      //             }
      //             return [...prev];
      //           });
      //         }
      //       } catch (error) {
      //         setMessages((prev) => {
      //           const lastMessage = prev[prev.length - 1];
      //           if (lastMessage.role === 'assistant') {
      //             lastMessage.content += value;
      //           } else {
      //             prev.push({ role: 'assistant', content: value });
      //           }
      //           return [...prev];
      //         });
      //       }
      //     }
      //   }
      setStatus("Running");
      setMessages([ ...messages,
        {
          role: "user",
          content: prompt.trim(),
        },
        {
          role: "assistant",
          content:
            "What is Lorem Ipsum? Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.",
        },
      ]);
    } catch (error) {
      console.error("Error:", error);
      setError(error as string);
    } finally {
      setIsDataLoading(false);
      setStatus("");
    }
  };

  return (
    <div className={styles.container}>
      { messages.length !== 0  &&<ChatHeader />}
      <div className={styles["message-container"]}>
        {messages.length === 0 ? (
          <div className={styles["empty-message"]}>
            <img
              src="/images/homepage.png"
              alt="Placeholder"
              style={{ height: "70vh" }}
            />
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <Message key={`${message.role}_${index}`} message={message} />
            ))}
          </>
        )}
        <div ref={messageEndRef} />
      </div>

      {status && <div className={styles["status-message"]}>{status}</div>}
      <div
        className={
          styles[
            `${
              messages.length === 0
                ? "textbox-container-empty"
                : "textbox-container"
            }`
          ]
        }
        style={status ? { paddingTop: "0.5rem" } : {}}
      >
        <textarea
          ref={textareaRef}
          placeholder="Type your message here..."
          className={styles.textbox}
          style={{ height: `${height}px !important` }}
          onChange={(e) => {
            console.log(e.target.scrollHeight);

            setHeight(e.target.scrollHeight);
            setPrompt(e.target.value);
          }}
          rows={1}
          value={prompt}
          disabled={isDataLoading}
          onKeyDown={handleKeyDown}
        />

        {messages.length !== 0 && (
          <Button
            type="light"
            className={styles["send-button"]}
            onClick={handleSubmit}
            loading={isDataLoading}
            disabled={isDataLoading || prompt.trim().length === 0}
          >
            <Icon
              icon="Send"
              size="small"
              className={
                styles[
                  `${
                    isDataLoading || prompt.trim().length === 0
                      ? "send-icon-disabled"
                      : "send-icon"
                  }`
                ]
              }
            />
          </Button>
        )}
      </div>
    </div>
  );
};

export default Playground;
