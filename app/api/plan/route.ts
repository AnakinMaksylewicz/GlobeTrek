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

    const amadeusKey = process.env.AMADEUS_API_KEY;
    const amadeusSecret = process.env.AMADEUS_API_SECRET;
    
    if (!amadeusKey || !amadeusSecret) {
        console.error("Missing Amadeus API credentials in environment variables.");
        return NextResponse.json({
            reply: "Server configuration error — missing Amadeus API credentials.",
        });
    }
    
    let amadeusToken = "";
    try{
        const authRes = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "client_credentials",
                client_id: amadeusKey,
                client_secret: amadeusSecret,
            }),
        });
        const authData = await authRes.json();
        amadeusToken = authData.access_token;
        console.log("Obtained Amadeus token:");
    }catch (err){
        console.error("Error fetching Amadeus token:", err);
        return NextResponse.json({
            reply: "I couldn't authenticate with the travel service. Please try again later.",
        });
    }
     
    let flightInfo: any = null;
    try {
        let destCode = "";
        const locRes = await fetch(
            `https://test.api.amadeus.com/v1/reference-data/locations/cities?keyword=${encodeURIComponent(destination)}&page[limit]=1`,
            { headers: { Authorization: `Bearer ${amadeusToken}` } }
        );
        const locData = await locRes.json();
        console.log("Amadeus location data:", JSON.stringify(locData, null, 2));
        destCode = locData.data?.[0]?.iataCode || "";

        if (!destCode) {
        const fallbackMap: Record<string, string> = {
                // --- North America ---
                newyork: "NYC", losangeles: "LAX", chicago: "CHI", miami: "MIA", 
                orlando: "ORL", atlanta: "ATL", dallas: "DFW", houston: "HOU", 
                boston: "BOS", seattle: "SEA", sanfrancisco: "SFO", denver: "DEN", 
                lasvegas: "LAS", washington: "WAS", philadelphia: "PHL", phoenix: "PHX", 
                sanantonio: "SAT", sanjose: "SJC", minneapolis: "MSP", detroit: "DTT",
                tampa: "TPA", portland: "PDX", charlotte: "CLT", saltlakecity: "SLC",
                nashville: "BNA", neworleans: "MSY", pittsburgh: "PIT", austin: "AUS",
                // Canada
                toronto: "YTO", vancouver: "YVR", montreal: "YMQ", calgary: "YYC",
                ottawa: "YOW", edmonton: "YEA", quebec: "YQB",
                // Mexico & Central America
                mexico: "MEX", cancun: "CUN", guadalajara: "GDL", monterrey: "MTY",
                panamacity: "PTY", sanjosecr: "SJO", belizecity: "BZE",
                sanpedrosula: "SAP", guatemala: "GUA", sanjuan: "SJU",

                // --- South America ---
                lima: "LIM", santiago: "SCL", buenosaires: "BUE", saopaulo: "SAO",
                riodejaneiro: "RIO", bogota: "BOG", quito: "UIO", montevideo: "MVD",
                asuncion: "ASU", laPaz: "LPB", santaCruz: "SRZ", caracas: "CCS",

                // --- Europe ---
                london: "LON", manchester: "MAN", edinburgh: "EDI", dublin: "DUB",
                paris: "PAR", nice: "NCE", lyon: "LYS", marseille: "MRS",
                madrid: "MAD", barcelona: "BCN", valencia: "VLC", seville: "SVQ",
                lisbon: "LIS", porto: "OPO",
                berlin: "BER", frankfurt: "FRA", munich: "MUC", hamburg: "HAM",
                amsterdam: "AMS", brussels: "BRU", zurich: "ZRH", geneva: "GVA",
                vienna: "VIE", prague: "PRG", budapest: "BUD", warsaw: "WAW",
                krakow: "KRK", copenhagen: "CPH", stockholm: "STO", gothenburg: "GOT",
                oslo: "OSL", helsinki: "HEL", reykjavik: "REK",
                athens: "ATH", thessaloniki: "SKG", rome: "ROM", milan: "MIL", venice: "VCE",
                florence: "FLR", naples: "NAP", dubrovnik: "DBV", zagreb: "ZAG",
                istanbul: "IST", ankara: "ESB", sofia: "SOF", bucharest: "BUH",
                belgrade: "BEG", ljubljana: "LJU", riga: "RIX", tallinn: "TLL",
                vilnius: "VNO",

                // --- Middle East & North Africa ---
                dubai: "DXB", abuDhabi: "AUH", doha: "DOH", riyadh: "RUH", jeddah: "JED",
                muscat: "MCT", cairo: "CAI", alexandria: "ALY", casablanca: "CAS",
                marrakech: "RAK", tunis: "TUN", algiers: "ALG", tehran: "THR",
                jerusalem: "TLV", amman: "AMM", beirut: "BEY", baghdad: "BGW",
                kuwaitcity: "KWI", manama: "BAH",

                // --- Sub-Saharan Africa ---
                nairobi: "NBO", addisababa: "ADD", johannesburg: "JNB", capetown: "CPT",
                durban: "DUR", lagos: "LOS", accra: "ACC", abuja: "ABV",
                dakar: "DKR",

                // --- South Asia ---
                delhi: "DEL", mumbai: "BOM", bangalore: "BLR", hyderabad: "HYD",
                chennai: "MAA", kolkata: "CCU", jaipur: "JAI", ahmedabad: "AMD",
                pune: "PNQ", kochi: "COK", kathmandu: "KTM", dhaka: "DAC",
                islamabad: "ISB", karachi: "KHI", lahore: "LHE", colombo: "CMB",
                male: "MLE",

                // --- East Asia ---
                tokyo: "TYO", osaka: "OSA", kyoto: "UKY", sapporo: "SPK", nagoya: "NGO",
                seoul: "SEL", busan: "PUS", beijing: "BJS", shanghai: "SHA",
                guangzhou: "CAN", shenzhen: "SZX", chengdu: "CTU", hongkong: "HKG",
                taipei: "TPE", kaohsiung: "KHH",

                // --- Southeast Asia ---
                bangkok: "BKK", phuket: "HKT", chiangmai: "CNX", hanoi: "HAN",
                hochiminh: "SGN", siemreap: "REP", phnompenh: "PNH",
                singapore: "SIN", kualalumpur: "KUL", jakarta: "JKT", bali: "DPS",
                manila: "MNL", cebu: "CEB",

                // --- Oceania & Pacific ---
                sydney: "SYD", melbourne: "MEL", brisbane: "BNE", perth: "PER",
                adelaide: "ADL", auckland: "AKL", wellington: "WLG", christchurch: "CHC",
                nadi: "NAN", honolulu: "HNL", suva: "SUV",

                // --- Eastern Europe & Central Asia ---
                moscow: "MOW", stpetersburg: "LED", tbilisi: "TBS", yerevan: "EVN",
                baku: "BAK", tashkent: "TAS", almaty: "ALA", astana: "NQZ",

                // --- East Africa & Indian Ocean ---
                mauritius: "MRU", seychelles: "SEZ", zanzibar: "ZNZ",
                kigali: "KGL", kampala: "EBB",

                // --- Caribbean ---
                kingston: "KIN", montegoBay: "MBJ", havana: "HAV", nassau: "NAS",
                portofspain: "POS", barbados: "BGI", santoDomingo: "SDQ",
                aruba: "AUA", curaçao: "CUR", stlucia: "SLU", grenada: "GND",
        };
        destCode = fallbackMap[destination.replace(/\s+/g, "").toLowerCase()] || "";
        console.log("Using fallback IATA code:", destCode);
    }

    const flightRes = await fetch(
        `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${destCode}&departureDate=${trip.start_date}&adults=1&currencyCode=USD&max=1`,
        { headers: { Authorization: `Bearer ${amadeusToken}` } }
        );

        const flightData = await flightRes.json();
        console.log("Amadeus flight response:", JSON.stringify(flightData, null, 2));

        if (flightData.data && flightData.data.length > 0) {
            const offer = flightData.data[0];
            flightInfo = {
                airline: offer.validatingAirlineCodes?.[0] || "Unknown",
                price: offer.price?.total || "N/A",
                currency: offer.price?.currency || "USD",
                departure: offer.itineraries?.[0]?.segments?.[0]?.departure?.iataCode,
                arrival: offer.itineraries?.[0]?.segments?.slice(-1)[0]?.arrival?.iataCode,
            };
        } else {
            console.warn("No flight data found for", origin, destCode, trip.start_date);
        }
    } catch (err) {
        console.error("Error fetching flight data:", err);
    }


    
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

    
    let hotelInfo: any = null;
    try {
    const hotelRes = await fetch(
        `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-geocode?latitude=${lat}&longitude=${lon}&radius=5`,
        { headers: { Authorization: `Bearer ${amadeusToken}` } }
    );

    if (hotelRes.ok) {
        const hotelData = await hotelRes.json();
        if (hotelData.data && hotelData.data.length > 0) {
        const h = hotelData.data[0];
        hotelInfo = {
            name: h.name,
            lat: h.geoCode?.latitude,
            lon: h.geoCode?.longitude,
            address: h.address?.lines?.join(", ") || "",
            city: h.address?.cityName || destination,
        };
        }
    } else {
        console.error("Hotel API error:", await hotelRes.text());
    }
    } catch (err) {
    console.error("Error fetching hotel data:", err);
    }

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

    let featuresArr = Array.isArray(placesData?.features) ? placesData.features : [];
    if (featuresArr.length === 0) {
        console.warn("No places found with preferred categories, falling back to tourism.attraction");
        const fallbackRes = await fetch(`https://api.geoapify.com/v2/places?categories=tourism.attraction&filter=circle:${lon},${lat},${radius}&limit=5&apiKey=${process.env.GEOAPIFY_API_KEY}`);
        const fallbackData = await fallbackRes.json();
        if(Array.isArray(fallbackData?.features)) {
            featuresArr = fallbackData.features;
        }
    }

    const activities = featuresArr.map((feature: any) => ({
        name: feature.properties.name,
        address: feature.properties.address_line1 || feature.properties.address_line2 || "",
        description: feature.properties.wikipedia_extracts?.text || feature.properties.formatted || feature.properties.details || "No description available.",
        lat: feature.geometry.coordinates[1],
        lon: feature.geometry.coordinates[0],
    })) || [];

    console.log("found activities: ", activities);

    try {
    const placesList = activities.map((a : any) => a.name).join(", ");

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
    
    
    let descJSON: any = {};
    try {
        descJSON = JSON.parse(cleanedDesc);
    } catch (err) {
        console.error("Failed to parse Gemini description JSON:", err, cleanedDesc);
    }

    if (descJSON.descriptions) {
        for (const d of descJSON.descriptions) {
        const found = activities.find((a : any) => a.name === d.name);
        if (found) found.description = d.desc;
        }
    }
    } catch (err) {
    console.error("Gemini description enrichment failed:", err);
    }


    const elevenKey = process.env.ELEVENLABS_API_KEY;
    let audioUrl = null;
    if(elevenKey){
        // Build comprehensive TTS script
        let ttsScript = `Here's your trip plan to ${destination}, optimized for your $${budget_usd} budget. `;
        
        if (flightInfo) {
            ttsScript += `You'll be flying with ${flightInfo.airline}.`;
        }
        
        if (hotelInfo) {
            ttsScript += `You'll be staying at ${hotelInfo.name}. `;
        }
        
        if (activities && activities.length > 0) {
            ttsScript += `For activities, `;
            activities.slice(0, 5).forEach((activity: any, index: number) => {
                if (index === 0) {
                    ttsScript += `you can visit ${activity.name}`;
                } else if (index === activities.slice(0, 5).length - 1) {
                    ttsScript += `, and ${activity.name}`;
                } else {
                    ttsScript += `, ${activity.name}`;
                }
                if (activity.description) {
                    ttsScript += `, ${activity.description}`;
                }
            });
            ttsScript += `. `;
        }
        
        ttsScript += `Have a wonderful trip!`;
        
        const ttsRes = await fetch("https://api.elevenlabs.io/v1/text-to-speech/c6SfcYrb2t09NHXiT80T", {
            method: "POST",
            headers: {
                "xi-api-key": elevenKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                text: ttsScript,
                voice_settings: { stability: 0.4, similarity_boost: 0.8 }
            }),
        });
        const arrayBuffer = await ttsRes.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        audioUrl = `data:audio/mpeg;base64,${base64}`;
    }

    return NextResponse.json({
        reply: `Here's your trip plan to ${destination}, optimized for your $${budget_usd} budget!`,
        flight: flightInfo,
        hotel: hotelInfo,
        activities,
        mapCenter: hotelInfo
            ? { lat: hotelInfo.lat, lon: hotelInfo.lon }
            : { lat, lon },
        audio: audioUrl,
        });
}