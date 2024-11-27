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

function Modal({ className }) {
  const navigate = useNavigate();
  const handleSubmit = (e) => {
    e.preventDefault();
    // handle form submissionn
    navigate(`/thread/${"sam"}`);
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
          <Input id="title" type="text" placeholder="Title" value="" />
          <Textarea id="desc" placeholder="Description" value="" />
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
