import { useParams } from "react-router-dom";

function Thread() {
  const params = useParams();
  return <div>{JSON.stringify(params)}</div>;
}

export default Thread;
