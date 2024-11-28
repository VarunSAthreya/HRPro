import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import "./index.css";
import { useEffect, useState } from "react";

function ThreadCard({ thread }: any) {
  const navigate = useNavigate();
  const [agentDetail, setAgentDetail] = useState<any>();

  useEffect(() => { 
    const fetchThreadDetail = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_API_URL}/v1/thread/${thread.id}`, {
            method: 'GET',
            headers: {
              'ngrok-skip-browser-warning': 'true',
              'User-Agent': 'MyCustomUserAgent'
            }
          }
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const res = await response.json();

        const responseAgent = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/v1/agent/${res.data.agent_id}`, {
          method: 'GET',
          headers: {
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'MyCustomUserAgent'
          }
        });
        if (!responseAgent.ok) {
          throw new Error(`HTTP error! status: ${responseAgent.status}`);
        }
        const resAgent = await responseAgent.json();

        setAgentDetail(resAgent.data);
      } catch (error) {
        console.error(error);
      }
    }
    fetchThreadDetail();
  }, []);

  return (
    <Card
      className="w-[350px] cursor-pointer my-4 thread-card"
      onClick={() => navigate(`/thread/${thread.id}`)}
    >
      <CardHeader>
        <CardTitle>{thread.title}</CardTitle>
        <CardDescription>{thread.description}</CardDescription>
        <p style={{ fontSize: '12px'}}>{agentDetail?.title}</p>
      </CardHeader>
    </Card>
  );
}

export default ThreadCard;
