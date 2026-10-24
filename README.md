# RollCall AI — Fun Event Attendance & Icebreaker App (Powered by Gemma 4)

## What It Does
**RollCall AI** is a simple, single-page attendance web app for any event, class, or meetup:
1. **Check In & Get a Funny AI Badge:** Anyone can type their name, a quick hobby or fun fact, and their current mood. **Gemma 4** creates a funny nickname and a playful one-line welcome message.
2. **Automatic Buddy Pairing:** When someone checks in, Gemma 4 pairs them up with another guest already in the room and gives them a fun icebreaker question to talk about. You can also click **Generate Room Pairings** to match everyone at once.
3. **Fun Message Enhancer for Organizers:** Guests can type a plain note to the event organizers (like asking for more chairs or praising the snacks) and let Gemma 4 rewrite it into something hilarious before sending.

---

## Verified Gemma 4 Model IDs

- **Google AI Studio (Gemini API):**
  - `gemma-4-26b-a4b-it` *(Default — 26B Mixture-of-Experts model, fast and responsive)*
  - `gemma-4-31b-it` *(31B Dense model, also supported and used as automatic backup)*
- **Local Ollama (`http://localhost:11434`):**
  - `gemma4:e2b` *(Default lightweight local model)*
  - Also supports `gemma4:e4b`, `gemma4:26b`, and `gemma4:31b` from the official [Ollama Gemma 4 library](https://ollama.com/library/gemma4).

---

## Setup

1. Install the project packages:
   ```bash
   npm install
   ```

2. Create your `.env` file by copying the example file:
   ```bash
   cp .env.example .env
   ```
   *(Your `.env` file is ignored by Git so your API key stays private on the server.)*

---

## How to Run with Google AI Studio (Gemini API)

By default, the app uses **Gemma 4** (`gemma-4-26b-a4b-it`, or `gemma-4-31b-it`) through Google AI Studio on the server side.

1. Open `.env` and set your `GEMINI_API_KEY`:
   ```env
   PROVIDER="api"
   GEMINI_API_KEY="your_real_api_key_here"
   GEMINI_MODEL="gemma-4-26b-a4b-it"
   ```
2. Start the app:
   ```bash
   npm run dev
   ```
3. Open **http://localhost:3000** in your browser.

---

## How to Run Locally with Ollama

You can switch to a local Gemma 4 model on your computer without changing any code—just set `PROVIDER=local`.

1. Install and start [Ollama](https://ollama.com) (runs on `http://localhost:11434` by default), then pull the Gemma 4 model:
   ```bash
   ollama pull gemma4:e2b
   ```
2. Run the app with `PROVIDER=local`:
   ```bash
   PROVIDER=local npm run dev
   ```
   *(Or set `PROVIDER="local"` inside your `.env` file.)*

---

## How to Run the Smoke Test

The smoke test sends a realistic sample guest check-in and organizer message through whichever provider is active (`api` or `local`) and prints **PASS** or **FAIL**.

- **Test with Google AI Studio API:**
  ```bash
  PROVIDER=api npm run smoke
  ```

- **Test with local Ollama:**
  ```bash
  PROVIDER=local npm run smoke
  ```
