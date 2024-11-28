import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function MessageBox({ messages }: any) {
  
  const filteredMessages = messages.filter(
    (message: any) =>
      (message.role === "user" || message.role === "assistant") &&
      message.content 
  );
  
  return (
    <div >
      {filteredMessages.map((message: any, index: number) => (
        <div
          className={`flex w-full my-4 ${
            message.role === "assistant" ? "justify-start" : "justify-end"
            }`}
          key={index}
        >
          <div
            className={`flex p-2 items-start max-w-[80%] w-fit ${
              message.role !== "assistant" ? "flex-row-reverse" : ""
            }`}
          >
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
              <AvatarFallback>AI</AvatarFallback>
            </Avatar>
            <div className="bg-off-white rounded-sm mx-2 p-4">
              <p className="text-md text-black">
                {message.content}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>


  );
}

export default MessageBox;
