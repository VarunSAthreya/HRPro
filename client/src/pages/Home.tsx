// import Button from "../components/Button";
import Modal from "../components/Modal";
import PageLayout from "../components/PageLayout";
import ThreadCard from "../components/ThreadCard";

function Home() {
  return (
    <PageLayout>
      <Modal className={"self-end"} />
      <div className="flex items-center justify-around flex-wrap py-6">
        <ThreadCard />
        <ThreadCard />
        <ThreadCard />
        <ThreadCard />
        <ThreadCard />
        <ThreadCard />
        <ThreadCard />
        <ThreadCard />
        <ThreadCard />
        <ThreadCard />
        <ThreadCard />
        <ThreadCard />
        <ThreadCard />
        <ThreadCard />
        <ThreadCard />
        <ThreadCard />
      </div>
    </PageLayout>
  );
}

export default Home;
