import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom";
import styles from "./Playground.module.css";
import { MessagesSquare } from "lucide-react"
import homepage from "../../../public/images/homepage.png";

const OnBoarding = () => {
    return (
        <PageLayout>
            <div className={styles.onboarding}>
                <img src={homepage} alt="homepage" />
                <Link to="/onboarding/chat">
                    <Button><MessagesSquare />Start Onboarding</Button>
                </Link>
            </div>
        </PageLayout>
    )
}

export default OnBoarding;