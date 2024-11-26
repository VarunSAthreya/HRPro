import React, { FC } from "react";
import ReactMarkdown from "react-markdown";
import styles from "./Playground.module.css";
import { AgentMessage } from "../utils/constants";
import { Avatar, Icon, UserProfile } from "@contentstack/venus-components";

type Props = {
  message: AgentMessage;
};

const Message: FC<Props> = ({ message }) => {
  const containerClass =
    message.role === "user"
      ? "user-message-container"
      : "assistant-message-container";
  const messageClass =
    message.role === "user" ? "user-message" : "assistant-message";

  return (
    <div className={styles[containerClass]}>
      <ReactMarkdown
        className={styles[messageClass]}
        components={{
          // Custom rendering for paragraphs
          p: ({ children }) => (
            <>
              {message.role === "assistant" ? (
                <div style={{ display: "flex" }}>
                  <div className={styles["assistant-icon"]}>
                    <Icon version="v2" icon={"User"} size="small" />
                  </div>
                  <div className={styles["assistant-message-div"]}>
                    <p>{children}</p>
                  </div>
                </div>
              ) : (
                <p>{children}</p>
              )}
              {/* <img
                src="/images/cs.jpg"
                alt="Placeholder"
                style={{ width: "20px", height: "20px" }}
                /> */}
            </>
          ),
        }}
      >
        {message.content}
      </ReactMarkdown>
    </div>
  );
};

export default Message;
