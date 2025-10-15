require("dotenv").config();
import express from "express";
import { BASE_PROMPT, getSystemPrompt } from "./prompts";
import {basePrompt as nodeBasePrompt} from "./defaults/node";
import {basePrompt as reactBasePrompt} from "./defaults/react";
import cors from "cors";
import path from "path";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const app = express();
app.use(cors())
app.use(express.json())

app.post("/template", async (req, res) => {
    const prompt = req.body.prompt;
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "model": "z-ai/glm-4.5-air:free",
            "messages": [
                {
                    "role": "system",
                    "content": "Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra"
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        })
    });

    const data = await response.json();
    const answer = data.choices[0].message.content.toLowerCase().trim(); // react or node
    
    if (answer.includes("react")) {
        res.json({
            prompts: [BASE_PROMPT, `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [reactBasePrompt]
        })
        return;
    }

    if (answer.includes("node")) {
        res.json({
            prompts: [`Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [nodeBasePrompt]
        })
        return;
    }

    res.status(403).json({message: "You cant access this"})
    return;

})

app.post("/chat", async (req, res) => {
    const messages = req.body.messages;
    
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "z-ai/glm-4.5-air:free",
                "messages": [
                    {
                        "role": "system",
                        "content": getSystemPrompt()
                    },
                    ...messages
                ],
                "stream": true
            })
        });

        // Set headers for streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Stream the response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
            res.status(500).json({ error: "No response body" });
            return;
        }

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                        res.write('data: [DONE]\n\n');
                        continue;
                    }
                    
                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.delta?.content;
                        if (content) {
                            res.write(`data: ${JSON.stringify({ content })}\n\n`);
                        }
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            }
        }

        res.end();
    } catch (error) {
        console.error("Streaming error:", error);
        res.status(500).json({ error: "Streaming failed" });
    }
})

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
    const frontendDistPath = path.join(__dirname, '../../frontend/dist');
    app.use(express.static(frontendDistPath));
    
    // Handle React routing - return index.html for all other routes
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

