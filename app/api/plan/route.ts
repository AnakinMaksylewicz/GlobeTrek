import {NextResponse} from "next/server";
import {GoogleGenerativeAI} from "@google/generative-ai";

console.log("GEOAPIFY_API_KEY loaded:", !!process.env.GEOAPIFY_API_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
type Message = {
    role: "user" | "assistant";
    content: string;
}

export async function POST(request: Request) {
    const {messages} : {messages: Message[]} = await request.json();
    const chatHistory = messages.map(msg => `${msg.role === "user" ? "User" : "You"}: ${msg.content}`).join("\n");
    const model = genAI.getGenerativeModel({model: "gemini-2.5-flash"});
    const prompt = `
You are a travel planning assistant. The conversation so far is below. The user will describe a trip
they want to take. Your job is to extract or ask for the following fields:

- origin: city name or airport code (string)
- destination: city name (string)
- start_date: exact trip start date in ISO format (YYYY-MM-DD)
- end_date: exact trip end date in ISO format (YYYY-MM-DD)
- duration_days: number of days (integer)
- budget_usd: numeric value in U.S. dollars (integer, no symbols)
- preferences: comma-separated keywords for activities or interests (optional)

If you have **all** of these fields, respond ONLY in **raw JSON**, do not include backticks or code blocks, exactly in this format:
{
  "origin": "MIA",
  "destination": "Tokyo",
  "start_date": "2026-03-10",
  "end_date": "2026-03-15",
  "duration_days": 5,
  "budget_usd": 1500,
  "preferences": "food, nightlife"
}

Rules for JSON output:
- Dates **must** be in YYYY-MM-DD format.
- Numbers should not include commas or symbols.
- Use U.S. dollars for budget.
- If the user did not specify a start or end date but mentioned month/duration, infer exact ISO dates assuming the 10th of that month as a starting day.
- If any fields are missing, respond in plain text asking for the missing information — do NOT return JSON in that case.
- Never include any extra text or explanation outside the JSON.

Conversation so far:
${chatHistory}
`;

    const result = await model.generateContent(prompt);
    const reply = result.response.text();
    console.log("Gemini raw reply:", reply);

    let jsonData;
    let cleanedReply = reply
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/, "")
        .trim();
    try{
        jsonData = JSON.parse(cleanedReply);
        console.log("Parsed JSON data:", jsonData);
    } catch(err){
        console.error("JSON parsing error:", err);
        console.log("Cleaned reply that caused error:", cleanedReply);
        return NextResponse.json({reply});
    }
 
    const trip = jsonData;

    const origin = trip.origin?.trim();
    const destination = trip.destination?.trim();
    const budget_usd = Number(String(trip.budget_usd).replace(/[^0-9.]/g, ""));
    const duration_days = Number(trip.duration_days);
    
    
    const geoKey = process.env.GEOAPIFY_API_KEY;
    if (!geoKey) {
    console.error("Missing GEOAPIFY_API_KEY in environment variables.");
    return NextResponse.json({
        reply: "Server configuration error — missing Geoapify API key.",
    });
    }


    const geoUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
    destination + ", " + (trip.country || "")
    )}&apiKey=${geoKey}`;

    console.log("Geoapify request:", geoUrl.replace(geoKey, "****"));


    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) {
    const errText = await geoRes.text();
    console.error("Geoapify geocode failed:", geoRes.status, errText);
    return NextResponse.json({
        reply: `I couldn't look up coordinates for "${destination}" (Geoapify error ${geoRes.status}).`,
    });
    }

    const geoData = await geoRes.json();
    console.log("Geoapify payload keys:", Object.keys(geoData || {}));


    const features = Array.isArray(geoData?.features) ? geoData.features : [];
    if (features.length === 0) {
    console.error("No features returned from Geoapify for:", destination);
    return NextResponse.json({
        reply: `I couldn't find the location "${destination}". Try including the country (e.g. "${destination}, Japan").`,
    });
    }


    const coords = features[0]?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) {
    console.error("Unexpected coordinate format:", coords);
    return NextResponse.json({
        reply: `Found "${destination}" but couldn’t read its coordinates. Try again.`,
    });
    }

    const lon = coords[0];
    const lat = coords[1];
    console.log(`Coordinates for ${destination}: lat=${lat}, lon=${lon}`);


    const prefMap: Record<string, string> = {
        museum: "tourism.museum",
        museums: "tourism.museum",
        food: "catering.restaurant|catering.cafe",
        nightlife: "entertainment.nightclub|entertainment.bar",
        nature: "natural",
        shopping: "commercial.shopping_mall|commercial.marketplace",
    };

    const preferenceWords = trip.preferences
        ? trip.preferences.toLowerCase().split(",").map((p: string) => p.trim())
        : [];
    
    const categories = preferenceWords
        .map((word: string) => prefMap[word])
        .filter(Boolean)
        .join("|") || "tourism.attraction";

    const radius = 8000;
    const placesRes = await fetch(`https://api.geoapify.com/v2/places?categories=${encodeURIComponent(categories)}&filter=circle:${lon},${lat},${radius}&limit=5&apiKey=${process.env.GEOAPIFY_API_KEY}`);

    const placesData = await placesRes.json();

    const activities = placesData.features.map((feature: any) => ({
        name: feature.properties.name,
        address: feature.properties.address_line1 || feature.properties.address_line2 || "",
        description: feature.properties.wikipedia_extracts?.text || feature.properties.formatted || feature.properties.details || "No description available.",
        lat: feature.geometry.coordinates[1],
        lon: feature.geometry.coordinates[0],
    })) || [];

    console.log("found activities: ", activities);

        // --- Optional Gemini enrichment: generate short tourist descriptions ---
    try {
    const placesList = activities.map((a) => a.name).join(", ");

    const descriptionPrompt = `
    Write a one-sentence, friendly tourist description for each of these attractions in ${destination}.
    Respond ONLY in JSON in this format:
    {
        "descriptions": [
        {"name": "雷門", "desc": "A historic gate marking the entrance to Asakusa's Senso-ji Temple."},
        {"name": "東京スカイツリー", "desc": "Japan's tallest tower offering panoramic views of Tokyo."}
        ]
    }

    Attractions: ${placesList}
    `;

    const descResult = await model.generateContent(descriptionPrompt);
    const descText = descResult.response.text().trim();

    let cleanedDesc = descText
    .replace(/^```json\s*/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();
    
    // try to parse Gemini output safely
    let descJSON: any = {};
    try {
        descJSON = JSON.parse(cleanedDesc);
    } catch (err) {
        console.error("Failed to parse Gemini description JSON:", err, cleanedDesc);
    }

    if (descJSON.descriptions) {
        for (const d of descJSON.descriptions) {
        const found = activities.find((a) => a.name === d.name);
        if (found) found.description = d.desc;
        }
    }
    } catch (err) {
    console.error("Gemini description enrichment failed:", err);
    }


    return NextResponse.json({reply: `Here are some suggested activities in ${destination}:`,
        activities
    });
}