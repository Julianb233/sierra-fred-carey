import { Stagehand } from "@browserbasehq/stagehand";
import { readFileSync } from "fs";

const proformaText = readFileSync("/home/dev/.gemini/antigravity/brain/0f32228c-984d-44c0-b9c6-d72c3bedb516/financial_proforma.md", "utf-8");

async function main() {
    const BROWSERBASE_CONTEXT_ID = "ed424c84-729a-49f3-bfe2-811d5cda5282";

    const sessionRes = await fetch("https://www.browserbase.com/v1/sessions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-bb-api-key": process.env.BROWSERBASE_API_KEY!,
        },
        body: JSON.stringify({
            projectId: process.env.BROWSERBASE_PROJECT_ID!,
            browserSettings: {
                context: {
                    id: BROWSERBASE_CONTEXT_ID,
                    persist: true,
                },
            },
        }),
    });

    if (!sessionRes.ok) {
        throw new Error(`Session error: ${await sessionRes.text()}`);
    }
    const session = await sessionRes.json();

    const stagehand = new Stagehand({
        browserbaseSessionID: session.id,
        env: "BROWSERBASE",
        model: "gemini-2.0-flash" as const,
    });

    await stagehand.init();

    try {
        console.log("Navigating to WhatsApp Web...");
        await stagehand.act("Navigate to https://web.whatsapp.com");
        await new Promise((r) => setTimeout(r, 8000));

        console.log("Searching for Sahara Founders...");
        await stagehand.act("Click the search box, and write the text 'Sahara Founders' in it");
        await new Promise((r) => setTimeout(r, 3000));

        console.log("Clicking on Sahara Founders chat...");
        await stagehand.act("Click on the 'Sahara Founders' group chat in the search results");
        await new Promise((r) => setTimeout(r, 3000));

        console.log("Sending proforma...");
        await stagehand.act("Click the 'Type a message' input field at the bottom of the chat");

        await stagehand.act(`Type the following text into the message input: ${proformaText.slice(0, 500)}`);

        await stagehand.act("Press Enter to send the message");

        console.log("Successfully sent the message!");
    } finally {
        await stagehand.close();
    }
}

main().catch(console.error);
