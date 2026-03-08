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
        enableCaching: false,
        modelName: "gpt-4o",
        modelClientOptions: { apiKey: process.env.OPENAI_API_KEY },
    });

    const { page } = await stagehand.init();

    try {
        console.log("Navigating to WhatsApp Web...");
        await page.goto("https://web.whatsapp.com", { waitUntil: "networkidle", timeout: 30000 });
        await page.waitForTimeout(8000);

        console.log("Searching for Sahara Founders...");
        await stagehand.act({ action: "Click the search box, and write the text 'Sahara Founders' in it" });
        await page.waitForTimeout(3000);

        console.log("Clicking on Sahara Founders chat...");
        await stagehand.act({ action: "Click on the 'Sahara Founders' group chat in the search results" });
        await page.waitForTimeout(3000);

        console.log("Sending proforma...");
        await stagehand.act({ action: "Click the 'Type a message' input field at the bottom of the chat" });

        await page.evaluate((text) => {
            const dataTransfer = new DataTransfer();
            dataTransfer.setData('text/plain', text);
            const event = new ClipboardEvent('paste', {
                clipboardData: dataTransfer,
                bubbles: true,
                cancelable: true
            });
            document.activeElement?.dispatchEvent(event);
        }, proformaText);

        await page.waitForTimeout(1000);
        await page.keyboard.press("Enter");

        console.log("Successfully sent the message!");
    } finally {
        await stagehand.close();
    }
}

main().catch(console.error);
