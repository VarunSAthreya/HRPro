import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

function ThreadCard({thread}:any) {
  const navigate = useNavigate();
  return (
    <Card
      className="w-[350px] cursor-pointer my-4"
      onClick={() => navigate(`/thread/${thread.id}`)}
    >
      <CardHeader>
        <CardTitle>{thread.title}</CardTitle>
        <CardDescription>{thread.description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export default ThreadCard;
