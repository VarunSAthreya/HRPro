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
import { useState } from "react";

type FormDataType = {
  title: string;
  description: string;
  agent_id: string;
}

function Modal({ className }: any) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const navigate = useNavigate();
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    // handle form submissionn
    const formData: FormDataType = {
      title,
      description: desc,
      agent_id: "79ZlXjdFrNLkyAY"
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
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className={className}><PlusIcon />Create thread</Button>
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
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit}>
            Proceed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default Modal;
