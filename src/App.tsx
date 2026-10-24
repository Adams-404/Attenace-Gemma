import React, { useEffect, useState } from "react";
import {
  UserPlus,
  Users,
  Wand2,
  Send,
  Shuffle,
  Search,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  RotateCcw
} from "lucide-react";

interface Attendee {
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

interface OrganizerMessage {
  id: string;
  senderName: string;
  originalText: string;
  enhancedText: string;
  style: string;
  sentAt: string;
}

interface BuddyPair {
  pairTitle: string;
  memberA: string;
  memberB: string;
  sharedMission: string;
}

const VIBE_OPTIONS = [
  "Ready to mingle",
  "Need coffee first",
  "Here for laughs",
  "Curious & learning"
];

const ENHANCE_STYLES = [
  "Dramatic & Funny",
  "Rhyming Poem",
  "Sports Announcer",
  "Polite & Witty"
];

const SAMPLE_PROFILES = [
  {
    name: "Zainab Musa",
    about: "Amateur astronomer who bakes cinnamon rolls and memorizes movie quotes",
    vibe: "Ready to mingle"
  },
  {
    name: "David Kim",
    about: "Acoustic guitar player who fixes vintage bicycles and loves spicy ramen",
    vibe: "Here for laughs"
  },
  {
    name: "Fatima Danjuma",
    about: "Botanical illustrator who collects fountain pens and solves crosswords in ink",
    vibe: "Curious & learning"
  }
];

export default function App() {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [organizerMessages, setOrganizerMessages] = useState<OrganizerMessage[]>([]);
  const [buddyPairs, setBuddyPairs] = useState<BuddyPair[]>([]);
  const [providerInfo, setProviderInfo] = useState<{ provider: string; model: string }>({
    provider: "api",
    model: "gemma-4-26b-a4b-it"
  });
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Check-In Form State
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [vibe, setVibe] = useState(VIBE_OPTIONS[0]);
  const [checkingIn, setCheckingIn] = useState(false);
  const [latestCheckIn, setLatestCheckIn] = useState<Attendee | null>(null);

  // Roster Search & Pairing State
  const [searchQuery, setSearchQuery] = useState("");
  const [vibeFilter, setVibeFilter] = useState("All");
  const [pairingAll, setPairingAll] = useState(false);

  // Organizer Message State
  const [senderName, setSenderName] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [enhancedText, setEnhancedText] = useState("");
  const [selectedStyle, setSelectedStyle] = useState(ENHANCE_STYLES[0]);
  const [enhancing, setEnhancing] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [sampleIndex, setSampleIndex] = useState(0);

  useEffect(() => {
    async function fetchState() {
      try {
        const res = await fetch("/api/state");
        if (!res.ok) throw new Error("Could not load event state from server.");
        const data = await res.json();
        setAttendees(data.attendees || []);
        setOrganizerMessages(data.organizerMessages || []);
        setProviderInfo({
          provider: data.provider || "api",
          model: data.model || "gemma-4-26b-a4b-it"
        });
      } catch (err: unknown) {
        setErrorBanner(err instanceof Error ? err.message : "Failed to connect to server.");
      } finally {
        setLoadingInitial(false);
      }
    }
    fetchState();
  }, []);

  function handleFillSample() {
    const sample = SAMPLE_PROFILES[sampleIndex % SAMPLE_PROFILES.length];
    setSampleIndex((prev) => prev + 1);
    setName(sample.name);
    setAbout(sample.about);
    setVibe(sample.vibe);
    setSenderName(sample.name);
    setOriginalText(
      "Hey organizers, the playlist is great! Could we get a few more chairs near the back table?"
    );
    setEnhancedText("");
    setErrorBanner(null);
  }

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !about.trim()) {
      setErrorBanner("Please enter both your name and a short fun fact or interest.");
      return;
    }

    setCheckingIn(true);
    setErrorBanner(null);

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, about, vibe })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Check-in failed.");
      }

      setAttendees(data.attendees);
      setLatestCheckIn(data.attendee);
      setSenderName(data.attendee.name);
      setName("");
      setAbout("");
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : "Could not complete check-in.");
    } finally {
      setCheckingIn(false);
    }
  }

  async function handlePairEveryone() {
    setPairingAll(true);
    setErrorBanner(null);
    try {
      const res = await fetch("/api/pair-all", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not generate buddy pairs.");
      }
      setBuddyPairs(data.pairs || []);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : "Could not pair attendees.");
    } finally {
      setPairingAll(false);
    }
  }

  async function handleEnhanceText() {
    if (!originalText.trim()) {
      setErrorBanner("Type a rough message to the organizers first, then click Enhance.");
      return;
    }

    setEnhancing(true);
    setErrorBanner(null);
    try {
      const res = await fetch("/api/enhance-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName: senderName.trim() || "Checked-In Guest",
          originalText,
          style: selectedStyle
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to enhance message.");
      }
      setEnhancedText(data.enhancedText || "");
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : "Failed to enhance text.");
    } finally {
      setEnhancing(false);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!originalText.trim()) {
      setErrorBanner("Please write a message before sending to the organizers.");
      return;
    }

    setSendingMsg(true);
    setErrorBanner(null);
    try {
      const res = await fetch("/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName: senderName.trim() || latestCheckIn?.name || "Checked-In Guest",
          originalText,
          enhancedText,
          style: selectedStyle
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send message.");
      }
      setOrganizerMessages(data.organizerMessages || []);
      setOriginalText("");
      setEnhancedText("");
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSendingMsg(false);
    }
  }

  const filteredAttendees = attendees.filter((person) => {
    const matchesVibe = vibeFilter === "All" || person.vibe === vibeFilter;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesVibe;
    return (
      matchesVibe &&
      (person.name.toLowerCase().includes(q) ||
        person.nickname.toLowerCase().includes(q) ||
        person.about.toLowerCase().includes(q) ||
        person.pairedWith.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="flex items-center justify-between gap-8 px-6 lg:px-12 py-4 bg-white border-b border-slate-200 sticky top-0 z-20">
        <a
          href="#top"
          className="text-xl font-bold tracking-tight text-slate-900 font-display whitespace-nowrap shrink-0"
        >
          RollCall AI
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a
            href="#checkin-section"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Check In
          </a>
          <a
            href="#roster-section"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Attendee Roster
          </a>
          <a
            href="#pairings-section"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Buddy Pairs
          </a>
          <a
            href="#organizer-section"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Organizer Desk
          </a>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleFillSample}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Fill Sample Guest
          </button>
        </div>
      </header>

      <main id="top" className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-12 py-10 space-y-12">
        {/* Hero & Summary Strip */}
        <section className="space-y-6">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-medium text-slate-500">
              Event Attendance & Icebreaker · Powered by Gemma 4 ({providerInfo.model} via{" "}
              {providerInfo.provider === "local" ? "Local Ollama" : "Google AI Studio"})
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 font-display text-balance">
              Check in, get a funny AI nickname, meet your event buddy, and message the hosts.
            </h1>
            <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
              Everyone can sign the attendance sheet below. When you check in, Gemma 4 invents a
              playful title for you and pairs you with someone in the room so nobody stands awkward
              and alone.
            </p>
          </div>

          {/* 3-Column Metric Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2 border-t border-slate-200">
            <div>
              <div className="text-xs text-slate-500">Checked-In Guests</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                {attendees.length}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">AI Buddy Connections Made</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                {attendees.length + buddyPairs.length}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Enhanced Notes to Organizers</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                {organizerMessages.length}
              </div>
            </div>
          </div>
        </section>

        {/* Error Notification Banner */}
        {errorBanner && (
          <div
            role="alert"
            className="flex items-start justify-between gap-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Something went wrong</p>
                <p className="text-red-800 mt-0.5">{errorBanner}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-xs font-medium text-red-700 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Section 1: Check-In Form + Instant AI Pass Result */}
        <section
          id="checkin-section"
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch"
        >
          {/* Left: Check-In Form */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 font-display">
                    01. Quick Attendance Check-In
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Tell us your name and one thing you enjoy. Gemma 4 handles the rest.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleFillSample}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Try Sample Info
                </button>
              </div>

              <form onSubmit={handleCheckIn} className="space-y-5">
                <div>
                  <label
                    htmlFor="guest-name"
                    className="block text-sm font-medium text-slate-800 mb-1.5"
                  >
                    Your Name
                  </label>
                  <input
                    id="guest-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Mohammed Aliyu"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  />
                </div>

                <div>
                  <label
                    htmlFor="guest-about"
                    className="block text-sm font-medium text-slate-800 mb-1.5"
                  >
                    One Fun Fact, Hobby, or What You Do
                  </label>
                  <input
                    id="guest-about"
                    type="text"
                    required
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    placeholder="e.g., I love baking sourdough bread and watching 90s sci-fi movies"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  />
                </div>

                <div>
                  <span className="block text-sm font-medium text-slate-800 mb-2">
                    Your Current Energy
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 bg-slate-100 rounded-xl">
                    {VIBE_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setVibe(option)}
                        className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap truncate cursor-pointer ${
                          vibe === option
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={checkingIn}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    {checkingIn ? "Gemma 4 is creating your badge & buddy..." : "Check In Now"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right: Latest Check-In Result Card */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
            {latestCheckIn ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    Checked In Successfully
                  </span>
                  <span className="font-mono tabular-nums">{latestCheckIn.checkedInAt}</span>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Official AI Nickname for {latestCheckIn.name}</div>
                  <h3 className="text-2xl font-bold text-slate-900 font-display mt-1">
                    “{latestCheckIn.nickname}”
                  </h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    {latestCheckIn.funnyWelcome}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200 space-y-2">
                  <div className="text-xs font-medium text-slate-500">
                    Your AI Buddy Match · Paired with {latestCheckIn.pairedWith}
                  </div>
                  <p className="text-sm text-slate-800 leading-relaxed">
                    {latestCheckIn.pairReason}
                  </p>
                  <p className="text-xs text-slate-600 pt-1">
                    <span className="font-semibold text-slate-800">Icebreaker to ask them:</span>{" "}
                    “{latestCheckIn.icebreakerQuestion}”
                  </p>
                </div>
              </div>
            ) : (
              <div className="my-auto py-8 text-center space-y-3">
                <Users className="w-8 h-8 text-slate-400 mx-auto" />
                <h3 className="text-lg font-bold text-slate-900 font-display">
                  Your AI Welcome Pass Appears Here
                </h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Fill out the check-in box on the left (or click “Try Sample Info”) to get your
                  funny nickname and find out who Gemma 4 pairs you with.
                </p>
              </div>
            )}

            <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Everyone is welcome</span>
              <span>·</span>
              <span>Instant AI Buddy Match</span>
            </div>
          </div>
        </section>

        {/* Section 2: Organizer Message Enhancer & Live Feed */}
        <section
          id="organizer-section"
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-4 border-t border-slate-200"
        >
          {/* Left: Write & Enhance Message to Organizers */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-display">
                02. Message the Organizers (With AI Fun Enhancer)
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Need extra chairs, song requests, or just want to say hi? Type a normal message and
                let Gemma 4 spice it up before sending.
              </p>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-4">
              <div>
                <label
                  htmlFor="msg-sender"
                  className="block text-sm font-medium text-slate-800 mb-1"
                >
                  From (Your Name)
                </label>
                <input
                  id="msg-sender"
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g., Mohammed Aliyu"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label
                  htmlFor="msg-draft"
                  className="block text-sm font-medium text-slate-800 mb-1"
                >
                  What do you want to tell the organizers?
                </label>
                <textarea
                  id="msg-draft"
                  rows={3}
                  value={originalText}
                  onChange={(e) => setOriginalText(e.target.value)}
                  placeholder="e.g., The AC is freezing near the window, and when are the samosas arriving?"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-600 mb-1.5">
                  Choose Fun AI Rewrite Style
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl">
                  {ENHANCE_STYLES.map((styleName) => (
                    <button
                      key={styleName}
                      type="button"
                      onClick={() => setSelectedStyle(styleName)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap truncate cursor-pointer ${
                        selectedStyle === styleName
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {styleName}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Enhanced Preview Box */}
              {enhancedText && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-indigo-700">
                      Gemma 4 Enhanced Version ({selectedStyle})
                    </span>
                    <button
                      type="button"
                      onClick={() => setEnhancedText("")}
                      className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Clear
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={enhancedText}
                    onChange={(e) => setEnhancedText(e.target.value)}
                    className="w-full text-sm text-slate-900 bg-transparent focus:outline-none leading-relaxed"
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={enhancing || !originalText.trim()}
                  onClick={handleEnhanceText}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Wand2 className="w-4 h-4" />
                  {enhancing ? "Enhancing with AI..." : "Enhance My Text First"}
                </button>

                <button
                  type="submit"
                  disabled={sendingMsg || !originalText.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {sendingMsg
                    ? "Sending to Organizers..."
                    : enhancedText
                    ? "Send Enhanced Message"
                    : "Auto-Enhance & Send"}
                </button>
              </div>
            </form>
          </div>

          {/* Right: Organizer Inbox Feed */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 font-display">
                    Organizer Message Wall
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Live notes from checked-in attendees, enhanced by Gemma 4.
                  </p>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {organizerMessages.length} {organizerMessages.length === 1 ? "note" : "notes"}
                </span>
              </div>

              {organizerMessages.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <MessageSquare className="w-7 h-7 text-slate-400 mx-auto" />
                  <p className="text-sm text-slate-600">No messages sent to organizers yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto pr-1">
                  {organizerMessages.map((msg) => (
                    <article key={msg.id} className="py-4 first:pt-0 last:pb-0 space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <div>
                          <span className="font-semibold text-slate-900">{msg.senderName}</span>
                          <span className="mx-1.5" aria-hidden="true">
                            ·
                          </span>
                          <span>{msg.style}</span>
                        </div>
                        <span className="font-mono tabular-nums">{msg.sentAt}</span>
                      </div>
                      <p className="text-sm text-slate-900 leading-relaxed">
                        “{msg.enhancedText}”
                      </p>
                      <p className="text-xs text-slate-500">
                        Original note: {msg.originalText}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 3: AI Group Pairings Generator */}
        <section id="pairings-section" className="pt-4 border-t border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-display">
                03. AI Event Matchmaker (Pair Up the Room)
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Want to mix everyone up for a quick icebreaker round? Click the button to let Gemma
                4 pair up all checked-in attendees with a shared mini-mission.
              </p>
            </div>
            <button
              type="button"
              disabled={pairingAll || attendees.length < 2}
              onClick={handlePairEveryone}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Shuffle className="w-4 h-4" />
              {pairingAll ? "Gemma 4 is pairing everyone..." : "Generate Room Pairings"}
            </button>
          </div>

          {buddyPairs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {buddyPairs.map((pair, index) => (
                <div
                  key={`${pair.pairTitle}-${index}`}
                  className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2.5"
                >
                  <div className="text-xs text-slate-500 font-mono tabular-nums">
                    Duo #{index + 1} · {pair.memberA} & {pair.memberB}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    {pair.pairTitle}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{pair.sharedMission}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 4: Full Checked-In Roster */}
        <section id="roster-section" className="pt-4 border-t border-slate-200 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-display">
                04. Live Checked-In Attendance Roster
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Everyone who has signed in, their AI-generated nickname, and their recommended
                conversation buddy.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name or nickname..."
                  className="pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {["All", ...VIBE_OPTIONS].map((filterName) => (
                  <button
                    key={filterName}
                    type="button"
                    onClick={() => setVibeFilter(filterName)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      vibeFilter === filterName
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {filterName}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loadingInitial ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
              Loading attendance sheet...
            </div>
          ) : filteredAttendees.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
              <p className="text-sm text-slate-600">No attendees match your current search filter.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setVibeFilter("All");
                }}
                className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                      <th className="py-3.5 px-5">Guest & AI Nickname</th>
                      <th className="py-3.5 px-5">Fun Fact & Energy</th>
                      <th className="py-3.5 px-5">AI Buddy Match</th>
                      <th className="py-3.5 px-5 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {filteredAttendees.map((person) => (
                      <tr key={person.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-5 align-top">
                          <div className="font-semibold text-slate-900">{person.name}</div>
                          <div className="text-xs text-indigo-700 font-medium mt-0.5">
                            “{person.nickname}”
                          </div>
                          <div className="text-xs text-slate-500 mt-1 max-w-xs">
                            {person.funnyWelcome}
                          </div>
                        </td>
                        <td className="py-4 px-5 align-top max-w-xs">
                          <div className="text-slate-800">{person.about}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            Energy: {person.vibe}
                          </div>
                        </td>
                        <td className="py-4 px-5 align-top max-w-sm">
                          <div className="text-slate-900 font-medium">
                            Paired with {person.pairedWith}
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">{person.pairReason}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            Ask: “{person.icebreakerQuestion}”
                          </div>
                        </td>
                        <td className="py-4 px-5 align-top text-right font-mono tabular-nums text-xs text-slate-500 whitespace-nowrap">
                          {person.checkedInAt}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-6 lg:px-12 py-6 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>RollCall AI — Simple Event Attendance, Buddy Pairing & Organizer Notes</span>
          <span>
            Active Provider: {providerInfo.provider === "local" ? "Ollama Local" : "Google AI Studio API"} ·{" "}
            {providerInfo.model}
          </span>
        </div>
      </footer>
    </div>
  );
}
