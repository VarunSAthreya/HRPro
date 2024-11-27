import React from "react";
import styles from "./Playground.module.css";
import sendicon from "../../../public/images/sendicon.jpg";
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { Link } from "react-router-dom";

const ChatHeader = ({heading, route}: {heading: string, route: string}) => {
    return (
      <div className={styles['header']} >
        <Link to={`/${route}`}>
          <Button variant="outline" size="icon">
            <ChevronLeft />
          </Button>
        </Link>
        <p className={styles['header-title']}>{heading}</p>
        <img
          src={sendicon}
          alt="Placeholder"
          className={styles['header-icon']}
        />
      </div>
    )
}

export default ChatHeader;