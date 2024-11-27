// import Button from "../components/Button";
import PageLayout from "@/components/PageLayout";
import ThreadCard from "@/components/ThreadCard";
import Modal from "../components/Modal";

function Home() {
  const threads = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  return (
    <PageLayout>
      <Modal className={"self-end"} />
      <div className="flex items-center justify-left flex-wrap py-6 gap-[21px]">
        {threads.map((thread) => (
          <ThreadCard key={thread} id={thread} />
        ))}
      </div>
    </PageLayout>
  );
}

export default Home;
