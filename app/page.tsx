export default function Home() {
  return (
    //Entire page
    <div className="h-screen">
      {/*dashboard*/}
      <div className = "w-full h-1/8 bg-slate-400">dashboard</div>
      <div className = "flex w-full h-6/8 items-center">
        {/* Left area*/}
        <div className = "w-3/8 h-full p-2 bg-red-500">
        {/* Chat box w/ input */}
          <div className = "flex flex-col w-full gap-1 h-full p-2 bg-black justify-between">
            <div className = "flex-1 overflow-y-auto bg-blue-500">AI agent chat area</div>
            <div className = "bg-gray-800 p-2 rounded-e-xl">input box</div>
          </div>
        </div>
        {/* Right globe box */}
        <div className = "w-5/8 h-full bg-gray-500">
          globe
        </div>
      </div>
      <div className = "w-full h-1/8 bg-slate-400">Footer</div>
    </div>
  );
}
