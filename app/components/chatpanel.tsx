"use client";
import {useState} from "react";

type Message = {
    role: "user" | "assistant";
    content: string;
}

export default function chatpanel(){

    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSend(){
        if(!input.trim() || isLoading) return;
        const userMessage: Message = {role: "user", content: input};
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);
    }

    return (
        <div className = "flex flex-col w-full gap-1 h-full p-2 bg-black rounded-lg justify-between">
            <div className = "flex-1 p-3 overflow-y-auto bg-linear-to-b rounded-xl from-[#1e2124] to-[#243848]">AI agent chat area</div>
            <div className = "flex items-center bg-gray-800 p-2 rounded-xl">
              <textarea 
              value = {input}
                onChange = {(e) => setInput(e.target.value)}
              placeholder = "Plan me a trip to Hong Kong in March for $1500..." 
              className = "outline-none min-h-[60px] resize-none overflow-y-auto custom-scrollbar flex-1 focus:placeholder:opacity-0"/>
              <button 

              className="bg-blue-900 w-10 h-10 rounded-full cursor-pointer px-2 py-1 hover:bg-[#70c573] transition-color duration-200">
                <img src = "/images/sendButton.svg" className = "w-10 h-auto"/>
              </button>
            </div>
        </div>
    );
}