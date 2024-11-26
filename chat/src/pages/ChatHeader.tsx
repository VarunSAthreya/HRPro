import React from "react";
import styles from "./Playground.module.css";

const ChatHeader = () => {
    return (
        <div className={styles['header']} >
        <p className={styles['header-title']}>Employee OnBoarding</p>
        <img
              src="/images/send-icon.jpg"
              alt="Placeholder"
              className={styles['header-icon']}
            />
      </div>
    )
}

export default ChatHeader;