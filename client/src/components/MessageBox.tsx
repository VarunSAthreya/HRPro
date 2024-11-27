import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function MessageBox({ inputType = "agent" }) {
  return (
    <div
      className={`flex w-full my-4 ${
        inputType === "agent" ? "justify-start" : "justify-end"
      }`}
    >
      <div
        className={`flex p-2 items-start max-w-[80%] w-fit ${
          inputType !== "agent" ? "flex-row-reverse" : ""
        }`}
      >
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
          <AvatarFallback>AI</AvatarFallback>
        </Avatar>
        <div className="bg-off-white rounded-sm mx-2 p-4">
          <p className="text-md text-black">
            Hello , Im here to help youver since the 1500s, when an unknown
            printer took a galley of type and scrambled it to make a type
            specimen book. It has survived not only five centuries, but also the
            leap into electronic typesetting, remaining essentially unchanged.
            It was popularised in the 1960s with the release of Letraset sheets
            containing Lorem Ipsum passages, and more recently with desktop
            puver since the 1500s, when an unknown printer took a galley of type
            and scrambled it to make a type specimen book. It has survived not
            only five centuries, but also the leap into electronic typesetting,
            remaining essentially unchanged. It was popularised in the 1960s
            with the release of Letraset sheets containing Lorem Ipsum passages,
            and more recently with desktop puver since the 1500s, when an
            unknown printer took a galley of type and scrambled it to make a
            type specimen book. It has survived not only five centuries, but
            also the leap into electronic typesetting, remaining essentially
            unchanged. It was popularised in the 1960s with the release of
            Letraset sheets containing Lorem Ipsum passages, and more recently
            with desktop pu
          </p>
        </div>
      </div>
    </div>
  );
}

export default MessageBox;
