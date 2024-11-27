import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

function ThreadCard(props) {
  const navigate = useNavigate();
  return (
    <Card
      className="w-[350px] cursor-pointer my-4"
      onClick={() => navigate(`/thread/${props.id}`)}
    >
      <CardHeader>
        <CardTitle>SDE II</CardTitle>
        <CardDescription>Deploy your new project in one-click.</CardDescription>
      </CardHeader>
    </Card>
  );
}

export default ThreadCard;
