"use client";
import {useState, useRef, useEffect} from "react";

type Message = {
    role: "user" | "assistant";
    content: string;
}

export default function chatpanel({ setFlySequence }: { setFlySequence: (seq: any[]) => void }){

    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement | null>(null);

    async function handleSend(){
        if(!input.trim() || isLoading) return;

        console.log("Sending message:", input);

        const userMessage: Message = {role: "user", content: input};
        const newMessages = [...messages, userMessage];

        setMessages(newMessages);
        setInput("");
        setIsLoading(true);

        try{
            console.log("Sending messages to API:", newMessages);
            const response = await fetch("/api/plan", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({messages: newMessages}),
            });

            const data = await response.json();

            let assistantMessage: Message = {role: "assistant", content: data.reply};
            
            if (data.flight) {
                const f = data.flight;
                assistantMessage.content += `\n\nFlight Info:\n${f.airline || "Unknown Airline"} — ${f.departure || "?"} → ${f.arrival || "?"}`;
            }

            
            if (data.hotel) {
                const h = data.hotel;
                assistantMessage.content += `\n\n**Hotel:\n${h.name || "Unnamed Hotel"}\n${h.address || ""}`;
            }

            if (data.activities && Array.isArray(data.activities) && data.activities.length > 0) {
                const activitiesText = data.activities
                    .map(
                        (a: any, i: number) =>
                        `${i + 1}. ${a.name}${a.description ? ` – ${a.description}` : a.address ? ` – ${a.address}` : ""}`
                    )
                    .join("\n\n");

                assistantMessage.content += `\n\n${activitiesText}`;
            }

            setMessages((prev) => [...prev, assistantMessage]);
            if (data.hotel && data.activities) {
                const seq = [
                    { name: data.hotel.name, lat: data.hotel.lat, lon: data.hotel.lon },
                    ...data.activities.map((a: any) => ({ name: a.name, lat: a.lat, lon: a.lon }))
                ];
                setFlySequence(seq);
            }

        }
        catch (error) {
            console.error("Error sending message:", error);
            setMessages((prev) => [...prev, {role: "assistant", content: "Sorry, there was an error processing your request."}]);
        } finally{
            setIsLoading(false);
        }    

    }

    useEffect(() => {
        if(!chatContainerRef.current) return;
        const element = chatContainerRef.current;
        element.scrollTo({
            top: element.scrollHeight,
            behavior: "smooth"  
        });
    }, [messages]);

    return (
        <div className = "flex flex-col w-full gap-1 h-full p-2 bg-black rounded-lg justify-between">
            {/* Chat area */}
            <div 
            ref = {chatContainerRef}
            className = "flex-1 p-3 overflow-y-auto custom-scrollbar bg-linear-to-b rounded-xl from-[#1e2124] to-[#243848]">
                {messages.map((msg, index) => (
                    <div 
                    key={index}
                    className = {`my-2 p-2 whitespace-pre-wrap rounded-lg max-w-[80%] ${
                        msg.role === 'user' 
                        ? 'bg-blue-900 text-white self-end ml-auto'
                        : 'bg-[#70c573] text-white self-start mr-auto'
                        }`}
                    >
                        {msg.content}
                    </div>
                ))}
            </div>
            {/* Input area */}
            <div className = "flex items-center bg-gray-800 p-2 rounded-xl">
              <textarea 
              value = {input}
              onChange = {(e) => setInput(e.target.value)}
              onKeyDown = {(e) => {
                if(e.key === "Enter" && !e.shiftKey){
                    e.preventDefault();
                    handleSend();
                }
              }}
              placeholder = "Plan me a trip to Hong Kong in March for $1500..." 
              className = "outline-none min-h-[60px] resize-none overflow-y-auto custom-scrollbar flex-1 focus:placeholder:opacity-0 bg-gray-800 text-white p-2 rounded-lg"/>
              <button
                onClick = {handleSend}
                disabled = {isLoading}
              className="bg-blue-900 w-10 h-10 rounded-full cursor-pointer px-2 py-1 hover:bg-[#70c573] transition-color duration-200">
                <img src = "/images/sendButton.svg" className = "w-10 h-auto pointer-events-none"/>
              </button>
            </div>
        </div>
    );
}