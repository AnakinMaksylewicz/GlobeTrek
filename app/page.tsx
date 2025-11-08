import Globe from "./components/globe";
import Dashboard from "./components/dashboard";
import Footer from "./components/footer";

export default function Home() {

  return (
    //Entire page
    <div className="min-h-screen text-[1vw]">
      {/*dashboard*/}
      <div className = "flex justify-start items-center w-full h-[12vh] bg-[#1e2124] pl-1"><Dashboard /></div>
      <div className = "flex w-full h-[75vh] items-center">
        {/* Left area*/}
        <div className = "w-3/8 h-full p-2 bg-[#1e2124]">
        {/* Chat box w/ input */}
          <div className = "flex flex-col w-full gap-1 h-full p-2 bg-black rounded-lg justify-between">
            <div className = "flex-1 overflow-y-auto bg-linear-to-b rounded-xl from-[#36135a] to-[#5b209a]">AI agent chat area</div>
            <div className = "bg-gray-800 p-2 rounded-xl">input box</div>
          </div>
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
