import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkApiLimit, increamentApiLimit } from "@/lib/api-limit";
import { checkSubscription } from "@/lib/subscription";

// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ...

const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro-001" });

// ...

// import { checkSubscription } from "@/lib/subscription";
// import { incrementApiLimit, checkApiLimit } from "@/lib/api-limit";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const body = await req.json();
    const { messages } = body;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!genAI.apiKey) {
      return new NextResponse("OpenAI API Key not configured.", {
        status: 500,
      });
    }

    if (!messages) {
      return new NextResponse("Messages are required", { status: 400 });
    }

    const freeTrial = await checkApiLimit();
    const isPro = await checkSubscription();

    if (!freeTrial && !isPro)
      return new NextResponse("free trial has expired", { status: 403 });


    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = messages[messages.length - 1].content;
    // console.log("prompt", prompt);

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    if(!isPro)
      await increamentApiLimit();

    return NextResponse.json(text);
  } catch (error) {
    console.log("[GEMINI_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
