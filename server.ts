import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Attendee {
  id: string;
  name: string;
  about: string;
  vibe: string;
  checkedInAt: string;
  nickname: string;
  funnyWelcome: string;
  pairedWith: string;
  pairReason: string;
  icebreakerQuestion: string;
}

export interface OrganizerMessage {
  id: string;
  senderName: string;
  originalText: string;
  enhancedText: string;
  style: string;
  sentAt: string;
}

export interface BuddyPair {
  pairTitle: string;
  memberA: string;
  memberB: string;
  sharedMission: string;
}

// Initial realistic attendees so the room is lively right away
const attendees: Attendee[] = [
  {
    id: "att-1",
    name: "Tariq Bello",
    about: "Urban gardener who grows chili peppers and builds small solar gadgets",
    vibe: "Ready to mingle",
    checkedInAt: "09:05 AM",
    nickname: "Captain Solar Jalapeño",
    funnyWelcome: "Warning: Tariq brings both 12-volt circuits and 50,000 Scoville units to the snack table.",
    pairedWith: "Elena Rostova",
    pairReason: "Tariq grows the peppers and Elena codes midnight coffee timers—together they can automate spicy breakfast.",
    icebreakerQuestion: "What is the weirdest plant or gadget you have ever accidentally kept alive?"
  },
  {
    id: "att-2",
    name: "Elena Rostova",
    about: "Indie game designer who collects vintage mechanical keyboards and loves espresso",
    vibe: "Need coffee first",
    checkedInAt: "09:12 AM",
    nickname: "The Click-Clack Barista",
    funnyWelcome: "You can hear Elena typing from three blocks away, fueled purely by double shots of espresso.",
    pairedWith: "Tariq Bello",
    pairReason: "Both love tinkering with hardware and strong flavors—high chance of inventing a solar-powered espresso keyboard.",
    icebreakerQuestion: "If your current mood was a sound effect from a retro video game, what would it sound like?"
  },
  {
    id: "att-3",
    name: "Chidi Okafor",
    about: "High school math teacher, amateur stand-up comedian, and undefeated board game strategist",
    vibe: "Here for laughs",
    checkedInAt: "09:18 AM",
    nickname: "The Calculus Jester",
    funnyWelcome: "Chidi has already calculated the exact probability of winning the raffle while writing a joke about it.",
    pairedWith: "Tariq Bello",
    pairReason: "Chidi brings the math jokes and Tariq brings the solar gadgets—an unstoppable trivia team.",
    icebreakerQuestion: "Which board game rule do you secretly ignore whenever nobody is looking?"
  }
];

const organizerMessages: OrganizerMessage[] = [
  {
    id: "msg-1",
    senderName: "Elena Rostova",
    originalText: "The coffee machine near the entrance is running low on beans, please send backup!",
    enhancedText: "hear ye, noble organizers! The sacred Espresso Fountain by the main gate approaches a tragic drought. Dispatch emergency coffee beans before our collective productivity turns to dust!",
    style: "Dramatic & Funny",
    sentAt: "09:20 AM"
  }
];

export function getProviderConfig() {
  const provider = (process.env.PROVIDER || "api").toLowerCase() === "local" ? "local" : "api";
  // Official Gemma 4 models in Gemini API: "gemma-4-26b-a4b-it" (26B MoE) and "gemma-4-31b-it" (31B Dense)
  const geminiModel = process.env.GEMINI_MODEL || "gemma-4-26b-a4b-it";
  // Official Ollama endpoint and Gemma 4 tag ("gemma4:e2b", "gemma4:e4b", "gemma4:26b", "gemma4:31b")
  const ollamaUrl = (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "");
  const ollamaModel = process.env.OLLAMA_MODEL || "gemma4:e2b";
  return { provider, geminiModel, ollamaUrl, ollamaModel };
}

/**
 * Single unified AI text generation call.
 * Switches between Google AI Studio (Gemini API) and local Ollama based on PROVIDER env var.
 * Everything else in the app uses the exact same code path.
 */
export async function generateWithGemma(prompt: string): Promise<string> {
  const { provider, geminiModel, ollamaUrl, ollamaModel } = getProviderConfig();

  if (provider === "local") {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        prompt,
        stream: false,
        options: { temperature: 0.8 }
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(
        `Local Ollama request failed (${response.status}) at ${ollamaUrl} with model "${ollamaModel}". Make sure Ollama is running ("ollama serve" and "ollama pull ${ollamaModel}"). ${errText}`
      );
    }

    const data = (await response.json()) as { response?: string };
    if (!data.response) {
      throw new Error("Ollama returned an empty response.");
    }
    return data.response.trim();
  }

  // Default: PROVIDER="api" -> Google AI Studio (Gemini API) with GEMINI_API_KEY
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing on the server.");
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });

  const fallbackModel =
    geminiModel === "gemma-4-26b-a4b-it" ? "gemma-4-31b-it" : "gemma-4-26b-a4b-it";
  const modelsToTry = [geminiModel, fallbackModel];
  let lastError: unknown;

  for (const modelId of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelId,
          contents: prompt
        });

        const text = response.text;
        if (!text) {
          throw new Error(`Model ${modelId} returned an empty response.`);
        }
        return text.trim();
      } catch (err: unknown) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        const isTransient =
          msg.includes("503") ||
          msg.includes("500") ||
          msg.includes("INTERNAL") ||
          msg.includes("UNAVAILABLE") ||
          msg.includes("429");
        if (!isTransient) {
          throw err;
        }
        await new Promise((r) => setTimeout(r, 1200 * attempt));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemma 4 API request failed.");
}

/**
 * Extracts a JSON object safely from model output (strips markdown code fences if present).
 */
function parseJsonSafely<T>(rawText: string, fallback: T): T {
  try {
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as T;
    }
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

/**
 * Shared Code Path 1: Check in a person, generate a funny nickname + welcome roast,
 * and pair them up with an existing attendee.
 */
export async function runCheckInAI(input: {
  name: string;
  about: string;
  vibe: string;
  existingAttendees: Array<{ name: string; about: string; vibe: string }>;
}): Promise<{
  nickname: string;
  funnyWelcome: string;
  pairedWith: string;
  pairReason: string;
  icebreakerQuestion: string;
}> {
  const candidates = input.existingAttendees.filter(
    (a) => a.name.toLowerCase() !== input.name.toLowerCase()
  );
  const candidateSummary =
    candidates.length > 0
      ? candidates.map((c) => `- ${c.name} (${c.about}; mood: ${c.vibe})`).join("\n")
      : "- No one else yet (pair them with 'The Event Host' as a VIP starter buddy)";

  const prompt = `You are a witty, warm, and funny event host running an attendance check-in app.
A new guest just checked in:
- Name: ${input.name}
- Fun fact / info: ${input.about}
- Current mood: ${input.vibe}

People already checked in:
${candidateSummary}

Pick ONE person from the list above to pair ${input.name} with as their event buddy, and generate a funny check-in badge.
Respond ONLY with valid JSON matching this exact structure (no markdown, no extra text):
{
  "nickname": "A funny, creative 2 to 4 word title or nickname based on their info",
  "funnyWelcome": "One short, hilarious, friendly sentence welcoming them to the room",
  "pairedWith": "Exact name of the person you paired them with from the list",
  "pairReason": "One fun sentence explaining why these two make a great duo",
  "icebreakerQuestion": "One funny question the two of them should ask each other right now"
}`;

  const raw = await generateWithGemma(prompt);
  const fallbackPartner = candidates[0]?.name || "The Event Host";

  const parsed = parseJsonSafely(raw, {
    nickname: `Captain ${input.name.split(" ")[0]}`,
    funnyWelcome: `${input.name} has officially entered the building with ${input.vibe.toLowerCase()} energy!`,
    pairedWith: fallbackPartner,
    pairReason: `Both bring awesome energy and great stories to kick off the event.`,
    icebreakerQuestion: `If you two had to start a quirky side business in 5 minutes, what would you sell?`
  });

  return {
    nickname: parsed.nickname || `The Legendary ${input.name.split(" ")[0]}`,
    funnyWelcome: parsed.funnyWelcome || `Welcome ${input.name}!`,
    pairedWith: parsed.pairedWith || fallbackPartner,
    pairReason: parsed.pairReason || `A top-tier conversation match made by Gemma 4.`,
    icebreakerQuestion:
      parsed.icebreakerQuestion || `What is the funniest thing that happened to you this week?`
  };
}

/**
 * Shared Code Path 2: Enhance a user's plain message to the organizers into something fun.
 */
export async function runEnhanceMessageAI(input: {
  senderName: string;
  originalText: string;
  style: string;
}): Promise<{ enhancedText: string }> {
  const prompt = `You are a playful AI writing assistant inside an event attendance app.
An attendee named "${input.senderName}" wants to send a message to the event organizers.
Their original draft is: "${input.originalText}"
Requested fun style: "${input.style}"

Rewrite their message so it keeps the real meaning (so the organizers still know what they need or mean), but make it genuinely funny, entertaining, and written in the "${input.style}" style (max 2-3 sentences).
Respond ONLY with valid JSON in this exact format:
{
  "enhancedText": "Your funny rewritten message here"
}`;

  const raw = await generateWithGemma(prompt);
  const parsed = parseJsonSafely(raw, {
    enhancedText: raw.replace(/^["']|["']$/g, "")
  });

  return {
    enhancedText: parsed.enhancedText || input.originalText
  };
}

/**
 * Shared Code Path 3: Pair up everyone currently checked in into fun duo teams.
 */
export async function runBatchPairAI(
  roster: Array<{ name: string; about: string; vibe: string }>
): Promise<BuddyPair[]> {
  const rosterList = roster
    .map((p, idx) => `${idx + 1}. ${p.name} — ${p.about} (Mood: ${p.vibe})`)
    .join("\n");

  const prompt = `You are a fun event matchmaker. Pair up these checked-in attendees into duo teams (if there is an odd number, one person can be in a trio or paired with the last person).
Attendees:
${rosterList}

Respond ONLY with valid JSON matching this exact structure:
{
  "pairs": [
    {
      "pairTitle": "Funny duo team name",
      "memberA": "First person's name",
      "memberB": "Second person's name",
      "sharedMission": "A funny 1-sentence mini-challenge or topic for them to chat about"
    }
  ]
}`;

  const raw = await generateWithGemma(prompt);
  const parsed = parseJsonSafely<{ pairs: BuddyPair[] }>(raw, { pairs: [] });
  if (Array.isArray(parsed.pairs) && parsed.pairs.length > 0) {
    return parsed.pairs;
  }

  // Fallback pairing if JSON structure varied
  const fallbackPairs: BuddyPair[] = [];
  for (let i = 0; i < roster.length; i += 2) {
    const a = roster[i];
    const b = roster[i + 1] || roster[0];
    fallbackPairs.push({
      pairTitle: `The Dynamic Duo #${Math.floor(i / 2) + 1}`,
      memberA: a.name,
      memberB: b.name,
      sharedMission: "Compare your favorite snacks and invent a new event mascot together."
    });
  }
  return fallbackPairs;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Get current state + active provider info (never exposes API key)
  app.get("/api/state", (_req, res) => {
    const config = getProviderConfig();
    res.json({
      provider: config.provider,
      model: config.provider === "local" ? config.ollamaModel : config.geminiModel,
      attendees,
      organizerMessages
    });
  });

  // Check in a new attendee
  app.post("/api/checkin", async (req, res) => {
    try {
      const { name, about, vibe } = req.body as {
        name?: string;
        about?: string;
        vibe?: string;
      };

      if (!name?.trim() || !about?.trim()) {
        res.status(400).json({ error: "Please enter your name and a short fun fact or interest." });
        return;
      }

      const cleanName = name.trim();
      const cleanAbout = about.trim();
      const cleanVibe = (vibe || "Ready to mingle").trim();

      const aiResult = await runCheckInAI({
        name: cleanName,
        about: cleanAbout,
        vibe: cleanVibe,
        existingAttendees: attendees
      });

      const now = new Date();
      const checkedInAt = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const newAttendee: Attendee = {
        id: `att-${Date.now()}`,
        name: cleanName,
        about: cleanAbout,
        vibe: cleanVibe,
        checkedInAt,
        ...aiResult
      };

      attendees.unshift(newAttendee);
      res.json({ attendee: newAttendee, attendees });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to complete AI check-in.";
      res.status(500).json({ error: message });
    }
  });

  // Re-pair all checked-in attendees
  app.post("/api/pair-all", async (_req, res) => {
    try {
      const pairs = await runBatchPairAI(attendees);
      res.json({ pairs });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate AI pairings.";
      res.status(500).json({ error: message });
    }
  });

  // Preview AI fun enhancement for an organizer message
  app.post("/api/enhance-message", async (req, res) => {
    try {
      const { senderName, originalText, style } = req.body as {
        senderName?: string;
        originalText?: string;
        style?: string;
      };

      if (!originalText?.trim()) {
        res.status(400).json({ error: "Please type a message first so Gemma 4 can enhance it." });
        return;
      }

      const result = await runEnhanceMessageAI({
        senderName: (senderName || "Anonymous Guest").trim(),
        originalText: originalText.trim(),
        style: style || "Dramatic & Funny"
      });

      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to enhance message.";
      res.status(500).json({ error: message });
    }
  });

  // Send message to organizers (auto-enhances if not already enhanced)
  app.post("/api/send-message", async (req, res) => {
    try {
      const { senderName, originalText, enhancedText, style } = req.body as {
        senderName?: string;
        originalText?: string;
        enhancedText?: string;
        style?: string;
      };

      if (!originalText?.trim()) {
        res.status(400).json({ error: "Please write a message to send to the organizers." });
        return;
      }

      const cleanSender = (senderName || "Checked-In Guest").trim();
      const cleanOriginal = originalText.trim();
      const chosenStyle = style || "Dramatic & Funny";

      let finalEnhanced = enhancedText?.trim() || "";
      if (!finalEnhanced) {
        const aiEnhanced = await runEnhanceMessageAI({
          senderName: cleanSender,
          originalText: cleanOriginal,
          style: chosenStyle
        });
        finalEnhanced = aiEnhanced.enhancedText;
      }

      const newMsg: OrganizerMessage = {
        id: `msg-${Date.now()}`,
        senderName: cleanSender,
        originalText: cleanOriginal,
        enhancedText: finalEnhanced,
        style: chosenStyle,
        sentAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      organizerMessages.unshift(newMsg);
      res.json({ message: newMsg, organizerMessages });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send message.";
      res.status(500).json({ error: message });
    }
  });

  // Serve frontend (Vite middleware in dev, static dist in prod)
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, "0.0.0.0", () => {
    const cfg = getProviderConfig();
    console.log(
      `RollCall AI running on http://localhost:${port} [PROVIDER=${cfg.provider}, MODEL=${
        cfg.provider === "local" ? cfg.ollamaModel : cfg.geminiModel
      }]`
    );
  });
}

// Only start Express listener when run directly (not when imported by smoke-test.ts)
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer();
}
