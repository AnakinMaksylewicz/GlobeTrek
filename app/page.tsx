import Globe from "./components/globe";
import Dashboard from "./components/dashboard";
import Footer from "./components/footer";
import ChatPanel from "./components/chatpanel";

export default function Home() {

  return (
    //Entire page
    <div className="min-h-screen text-[1vw]">
      {/*dashboard*/}
      <div className = "flex justify-start items-center w-full h-[12vh] bg-black pl-1"><Dashboard /></div>
      <div className = "flex w-full h-[75vh] items-center">
        {/* Left area*/}
        <div className = "w-3/8 h-full p-2 bg-[#1e2124]">
        {/* Chat box w/ input */}
          <ChatPanel />
        </div>
        {/* Right globe box */}
        <div className = "w-5/8 h-full bg-gray-500">
          <Globe />
        </div>
      </div>
      {/* Separator line */}
      <div className="w-full h-1 bg-gray-700"></div>
      <div className = "w-full bg-[#1e2124]"><Footer /></div>
    </div>
  );
}
