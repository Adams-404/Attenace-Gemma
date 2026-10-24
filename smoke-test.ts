import "dotenv/config";
import { getProviderConfig, runCheckInAI, runEnhanceMessageAI } from "./server.ts";

/**
 * Smoke test script:
 * Sends realistic sample input through the active provider (PROVIDER=api or PROVIDER=local)
 * using the exact same code path as the web app, and prints PASS or FAIL.
 */
async function runSmokeTest() {
  const cfg = getProviderConfig();
  const activeModel = cfg.provider === "local" ? cfg.ollamaModel : cfg.geminiModel;

  console.log(`=== RollCall AI Smoke Test ===`);
  console.log(`Active Provider : ${cfg.provider}`);
  console.log(`Active Model    : ${activeModel}`);

  // Realistic sample input for an attendee checking in and messaging the organizers
  const sampleAttendee = {
    name: "Mohammed Aliyu",
    about: "Weekend baker who makes sourdough bread and loves sci-fi movies",
    vibe: "Ready to mingle",
    existingAttendees: [
      {
        name: "Tariq Bello",
        about: "Urban gardener who grows chili peppers and builds small solar gadgets",
        vibe: "Ready to mingle"
      },
      {
        name: "Elena Rostova",
        about: "Indie game designer who collects mechanical keyboards and loves espresso",
        vibe: "Need coffee first"
      }
    ]
  };

  const sampleOrganizerNote = {
    senderName: "Mohammed Aliyu",
    originalText: "Hi organizers, could we turn the music down a tiny bit in the back row? Also the snacks are awesome!",
    style: "Dramatic & Funny"
  };

  try {
    console.log(`\n1. Testing Check-In + Buddy Pairing with sample guest "${sampleAttendee.name}"...`);
    const checkInResult = await runCheckInAI(sampleAttendee);
    console.log(`   NicknameGenerated : ${checkInResult.nickname}`);
    console.log(`   FunnyWelcome      : ${checkInResult.funnyWelcome}`);
    console.log(`   PairedWith        : ${checkInResult.pairedWith}`);
    console.log(`   PairReason        : ${checkInResult.pairReason}`);

    console.log(`\n2. Testing Organizer Message Fun Enhancer...`);
    const enhanceResult = await runEnhanceMessageAI(sampleOrganizerNote);
    console.log(`   OriginalDraft     : ${sampleOrganizerNote.originalText}`);
    console.log(`   EnhancedMessage   : ${enhanceResult.enhancedText}`);

    const isValid =
      Boolean(checkInResult.nickname?.trim()) &&
      Boolean(checkInResult.pairedWith?.trim()) &&
      Boolean(enhanceResult.enhancedText?.trim());

    if (!isValid) {
      throw new Error("Output fields were empty.");
    }

    console.log(`\nPASS`);
    process.exit(0);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`\nError: ${errMsg}`);
    console.log(`FAIL`);
    process.exit(1);
  }
}

runSmokeTest();
