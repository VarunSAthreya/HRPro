import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { PlusIcon } from "lucide-react"
import { useEffect, useState } from "react";
import "./index.css"

type FormDataType = {
  title: string;
  description: string;
  agent_id: string;
}

type Agent = {
  id: string;
  name: string;
};

function Modal({ className }: any) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [agents, setAgents] = useState<Agent[] | undefined>(undefined);
  const [selectedAgent, setSelectedAgent] = useState("");

  const navigate = useNavigate();
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    // handle form submissionn
    const formData: FormDataType = {
      title,
      description: desc,
      agent_id: selectedAgent
    }

    const response = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/v1/thread`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const res = await response.json();
    navigate(`/thread/${res.data.id}`);
  };

  useEffect(() => {
    async function getAgents() {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/v1/agent`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const res = await response.json();
      setAgents(res.data);
     }

    getAgents()
  }, [title, desc]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className={`${className} create-btn`}><PlusIcon />Create thread</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Thread Details</DialogTitle>
          <DialogDescription>
            Make sure to fill out all the fields below
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center gap-4">
          <Input id="title" type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea id="desc" placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <select
            id="agent"
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="p-2 border rounded w-full"
          >
            <option value="" disabled>Select an agent</option>
            {agents?.map((agent:any) => (
              <option key={agent.id} value={agent.id}>
                {agent.title}
              </option>
            ))}

          </select>
        </div>
        <DialogFooter>
          <Button type="submit" className="proceed-btn" onClick={handleSubmit}>
            Proceed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default Modal;
