import PageLayout from "@/components/PageLayout";
import ThreadCard from "@/components/ThreadCard";
import Modal from "../components/Modal";
import { useEffect, useState } from "react";
import talentacquisition from "../public/images/talentacquisition.png";
import './Home.css'



const Home = () => {
  const [threads, setThreads] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/v1/thread`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const res = await response.json();
        setThreads(res.data);
      } catch (error:any) {
        setError(error.message);
      }
    };

    fetchThreads();
  }, []);


  return (
    <PageLayout>
      {
      threads.length === 0 ? (
        <div className={"talent-acquisition-homepage"}>
        <img src={talentacquisition} alt="talentacquisition-homepage" />
        <div style={{display:"flex"}}>
        <Modal className={"self-end acquisition-homepage-btn"} />
        </div>
    </div>
      )
    :
      (<>
      <p className="acquisition-heading">Talent Aquisition</p>
      <Modal className={"self-end"} />
      {error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="flex items-center justify-left flex-wrap py-6 gap-[21px] thread-list">
          {threads.map((thread: any) => (
            <ThreadCard key={thread.id} thread={thread} />
          ))}
        </div>
      )}
      </>)}
    </PageLayout>
  );
};

export default Home;