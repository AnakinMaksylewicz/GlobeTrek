import {NextResponse} from "next/server";

export async function POST(request: Request) {
    const {message} = await request.json();

    let reply = "I'll plan your trip when i know ur destination, budget, and dates.";

    if (message.toLowerCase().includes("hong kong")) {
        reply = "hong kong sounds good. what dates are you traveling and what's ur budget?";
    }
    return NextResponse.json({reply});
}