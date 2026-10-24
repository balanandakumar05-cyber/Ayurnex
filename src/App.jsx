import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { askAyurnex } from "./services/api";
import "./App.css";

/* =========================================================
   DATA
   ========================================================= */

const COUNTRIES = [
  {
    code: "IN",
    name: "India",
    description: "Indian Ayurvedic context",
    flag: "🇮🇳",
  },
  {
    code: "US",
    name: "United States",
    description: "US regulatory context",
    flag: "🇺🇸",
  },
  {
    code: "JP",
    name: "Japan",
    description: "Japanese regulatory context",
    flag: "🇯🇵",
  },
];

const LANGUAGES = [
  {
    code: "EN",
    name: "English",
    native: "English",
    flag: "GB",
  },
  {
    code: "HI",
    name: "Hindi",
    native: "हिन्दी",
    flag: "IN",
  },
];

const SUGGESTIONS = [
  "Benefits of Ashwagandha",
  "Uses of Turmeric",
  "Home remedies for cough",
  "Ayurvedic diet for immunity",
];

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: "home" },
  { id: "ask", label: "Ask AYURNEX", icon: "spark" },
  { id: "about", label: "About", icon: "info" },
  { id: "resources", label: "Resources", icon: "book" },
];

/* =========================================================
   HELPERS
   ========================================================= */

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createChat(title = "New conversation") {
  return {
    id: createId(),
    title,
    messages: [],
    createdAt: Date.now(),
  };
}

function getSourceKey(source) {
  return [
    source.title,
    source.page_start,
    source.page_end,
    source.heading,
  ].join("|");
}

function dedupeSources(list) {
  const seen = new Set();
  const result = [];

  for (const source of list || []) {
    const key = getSourceKey(source);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...source, key });
  }

  return result;
}

function formatPages(source) {
  if (source.page_start == null) return "";

  if (source.page_end && source.page_end !== source.page_start) {
    return `Pages ${source.page_start}–${source.page_end}`;
  }

  return `Page ${source.page_start}`;
}

function getSimilarity(source) {
  if (typeof source.similarity !== "number") return null;
  return Math.max(0, Math.min(100, Math.round(source.similarity * 100)));
}

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

/* =========================================================
   ICONS (inline SVG — no extra dependencies)
   ========================================================= */

const ICONS = {
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M18 6L6 18",
  plus: "M12 5v14M5 12h14",
  home: "M3 11.5L12 4l9 7.5M5.5 10v9.5h13V10M10 19.5v-5h4v5",
  spark: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.7 1.8L21.5 18.5l-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
  book: "M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z",
  chat: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  send: "M12 19V5M5 12l7-7 7 7",
  arrow: "M5 12h14M13 6l6 6-6 6",
  doc: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  chevron: "M6 9l6 6 6-6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  leaf: "M5 19c0-8 5-14 15-14 0 10-6 15-14 15M5 19c3-5 6-8 10-10",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4",
};

function Icon({ name, size = 18, className = "" }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

/* =========================================================
   SOURCE CARD
   ========================================================= */

function SourceCard({ source, index }) {
  const pages = formatPages(source);
  const percent = getSimilarity(source);

  return (
    <article className="source-card">
      <div className="source-card-head">
        <span className="source-number">{index + 1}</span>
        <span className="source-title">
          {source.title || "AYURNEX source"}
        </span>
      </div>

      {source.heading && (
        <div className="source-heading">{source.heading}</div>
      )}

      {(pages || percent !== null) && (
        <div className="source-meta">
          {pages && (
            <span className="source-pages">
              <Icon name="doc" size={12} />
              {pages}
            </span>
          )}

          {percent !== null && (
            <span className="similarity">
              <span className="similarity-bar">
                <i style={{ width: `${percent}%` }} />
              </span>
              {percent}% match
            </span>
          )}
        </div>
      )}
    </article>
  );
}

/* =========================================================
   APP
   ========================================================= */

function App() {
  const [step, setStep] = useState("country");

  const [country, setCountry] = useState("IN");
  const [language, setLanguage] = useState("EN");

  const [page, setPage] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [initialChat] = useState(() => createChat());
  const [chats, setChats] = useState([initialChat]);
  const [activeChatId, setActiveChatId] = useState(initialChat.id);

  // null = follow the latest AI response
  const [sourceMessageId, setSourceMessageId] = useState(null);

  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  const activeChat = chats.find((chat) => chat.id === activeChatId);

  const currentCountry = COUNTRIES.find((item) => item.code === country);
  const currentLanguage = LANGUAGES.find((item) => item.code === language);

  // All unique sources across the active chat (Resources page)
  const allSources = useMemo(() => {
    if (!activeChat) return [];

    return dedupeSources(
      activeChat.messages
        .filter((message) => message.role === "assistant")
        .flatMap((message) => message.sources || [])
    );
  }, [activeChat]);

  // Sources for the selected (default: latest) AI response — right panel
  const panel = useMemo(() => {
    const empty = { message: null, sources: [], question: "" };
    if (!activeChat) return empty;

    const messages = activeChat.messages;
    let index = -1;

    if (sourceMessageId) {
      index = messages.findIndex(
        (m) => m.id === sourceMessageId && m.role === "assistant"
      );
    }

    if (index === -1) {
      for (let i = messages.length - 1; i >= 0; i -= 1) {
        if (messages[i].role === "assistant") {
          index = i;
          break;
        }
      }
    }

    if (index === -1) return empty;

    const message = messages[index];
    let relatedQuestion = "";

    for (let i = index - 1; i >= 0; i -= 1) {
      if (messages[i].role === "user") {
        relatedQuestion = messages[i].content;
        break;
      }
    }

    return {
      message,
      sources: dedupeSources(message.sources),
      question: relatedQuestion,
    };
  }, [activeChat, sourceMessageId]);

  /* ---------- effects ---------- */

  useEffect(() => {
    document.documentElement.lang = language === "HI" ? "hi" : "en";
  }, [language]);

  useEffect(() => {
    if (!sidebarOpen) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape") setSidebarOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  }, [activeChat?.messages.length, loading, page, activeChatId, step]);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;

    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 150)}px`;
  }, [question, page, step]);

  /* ---------- actions ---------- */

  function closeSidebar() {
    setSidebarOpen(false);
  }

  function finishOnboarding() {
    setStep("app");
    setPage("home");
  }

  function startNewChat() {
    // Reuse the current chat if it is still empty
    if (activeChat && activeChat.messages.length === 0) {
      setPage("ask");
      setQuestion("");
      setError("");
      closeSidebar();
      return;
    }

    const chat = createChat();

    setChats((previous) => [chat, ...previous]);
    setActiveChatId(chat.id);
    setSourceMessageId(null);
    setPage("ask");
    setQuestion("");
    setError("");
    closeSidebar();
  }

  function openChat(chatId) {
    setActiveChatId(chatId);
    setSourceMessageId(null);
    setPage("ask");
    setError("");
    closeSidebar();
  }

  function navigate(target) {
    setPage(target);

    if (target === "ask" && !activeChatId) {
      const chat = createChat();
      setChats((previous) => [chat, ...previous]);
      setActiveChatId(chat.id);
    }

    closeSidebar();
  }

  async function submitQuestion(value = question) {
    const text = value.trim();

    if (!text || loading) return;

    let chatId = activeChatId;

    if (!chatId) {
      const newChat = createChat(text.slice(0, 42));
      chatId = newChat.id;

      setChats((previous) => [newChat, ...previous]);
      setActiveChatId(chatId);
    }

    setPage("ask");
    setQuestion("");
    setError("");
    setLoading(true);

    const userMessage = {
      id: createId(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };

    setChats((previous) =>
      previous.map((chat) => {
        if (chat.id !== chatId) return chat;

        return {
          ...chat,
          title:
            chat.messages.length === 0
              ? text.length > 42
                ? `${text.slice(0, 42)}...`
                : text
              : chat.title,
          messages: [...chat.messages, userMessage],
        };
      })
    );

    try {
      const response = await askAyurnex({
        question: text,
        country,
        language,
      });

      const assistantMessage = {
        id: createId(),
        role: "assistant",
        content:
          response.answer ||
          "AYURNEX could not generate an answer for this question.",
        sources: response.sources || [],
        createdAt: Date.now(),
      };

      setChats((previous) =>
        previous.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                messages: [...chat.messages, assistantMessage],
              }
            : chat
        )
      );

      setSourceMessageId(null);
    } catch (err) {
      setError(
        err?.message ||
          "Unable to connect to AYURNEX. Please check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleInputKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitQuestion();
    }
  }

  /* =========================================================
     ONBOARDING — COUNTRY
     ========================================================= */

  if (step === "country") {
    return (
      <div className="onboarding">
        <div className="onboarding-card">
          <div className="onboarding-brand">
            <div className="brand-mark">
              <Icon name="leaf" size={19} />
            </div>
            <span className="onboarding-wordmark">AYURNEX</span>
          </div>

          <div className="onboarding-step">Step 1 of 2</div>

          <h1>Select your country</h1>

          <p className="onboarding-lead">
            Choose your country to help AYURNEX provide information using the
            appropriate regional context.
          </p>

          <div
            className="option-grid cols-3"
            role="group"
            aria-label="Country"
          >
            {COUNTRIES.map((item) => (
              <button
                key={item.code}
                type="button"
                className={`option-card${
                  country === item.code ? " selected" : ""
                }`}
                aria-pressed={country === item.code}
                onClick={() => setCountry(item.code)}
              >
                <span className="option-check">
                  <Icon name="check" size={12} />
                </span>

                <span className="option-flag">{item.flag}</span>

                <span className="option-body">
                  <span className="option-title">{item.name}</span>
                  <span className="option-desc">{item.description}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="onboarding-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setStep("language")}
            >
              Continue
              <Icon name="arrow" size={16} />
            </button>
          </div>

          <p className="onboarding-note">
            You can change your country later from the application.
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
     ONBOARDING — LANGUAGE
     ========================================================= */

  if (step === "language") {
    return (
      <div className="onboarding">
        <div className="onboarding-card">
          <div className="onboarding-brand">
            <div className="brand-mark">
              <Icon name="leaf" size={19} />
            </div>
            <span className="onboarding-wordmark">AYURNEX</span>
          </div>

          <div className="onboarding-step">Step 2 of 2</div>

          <h1>Select your language</h1>

          <p className="onboarding-lead">
            Choose the language you would like to use with AYURNEX.
          </p>

          <div
            className="option-grid cols-2"
            role="group"
            aria-label="Language"
          >
            {LANGUAGES.map((item) => (
              <button
                key={item.code}
                type="button"
                className={`option-card${
                  language === item.code ? " selected" : ""
                }`}
                aria-pressed={language === item.code}
                onClick={() => setLanguage(item.code)}
              >
                <span className="option-check">
                  <Icon name="check" size={12} />
                </span>

                <span className="option-code">{item.flag}</span>

                <span className="option-body">
                  <span className="option-title">{item.name}</span>
                  <span className="option-desc">{item.native}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="onboarding-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setStep("country")}
            >
              Back
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={finishOnboarding}
            >
              Continue
              <Icon name="arrow" size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     MAIN APP
     ========================================================= */

  const pageTitle =
    page === "home"
      ? "AYURNEX"
      : page === "ask"
        ? activeChat?.title || "New conversation"
        : page === "about"
          ? "About AYURNEX"
          : "Knowledge Resources";

  const chatIsEmpty = !activeChat || activeChat.messages.length === 0;

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* =====================================================
          LEFT SIDEBAR
          ===================================================== */}

      <aside
        id="app-sidebar"
        className={`sidebar${sidebarOpen ? " open" : ""}`}
        aria-label="Primary"
      >
        <div className="sidebar-brand">
          <div className="brand-mark">
            <Icon name="leaf" size={19} />
          </div>

          <div className="brand-text">
            <div className="brand-name">AYURNEX</div>
            <span className="brand-subtitle">Ayurveda AI</span>
          </div>

          <button
            type="button"
            className="sidebar-close"
            onClick={closeSidebar}
            aria-label="Close menu"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <button
          type="button"
          className="new-chat-button"
          onClick={startNewChat}
        >
          <Icon name="plus" size={16} />
          New Chat
        </button>

        <nav className="sidebar-nav" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={page === item.id ? "active" : ""}
              aria-current={page === item.id ? "page" : undefined}
              onClick={() => navigate(item.id)}
            >
              <Icon name={item.icon} size={17} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="history-section">
          <div className="history-title">Chat History</div>

          <div className="history-list">
            {chats.map((chat) => (
              <button
                key={chat.id}
                type="button"
                className={`history-item${
                  activeChatId === chat.id ? " active" : ""
                }`}
                onClick={() => openChat(chat.id)}
                title={chat.title}
              >
                <Icon name="chat" size={15} />
                <span className="history-label">{chat.title}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-context">
            <span className="context-chip">{currentCountry?.name}</span>
            <span className="context-chip">{currentLanguage?.name}</span>
          </div>

          <div className="sidebar-tagline">
            Educational Ayurveda knowledge assistant
          </div>
        </div>
      </aside>

      {/* =====================================================
          MAIN CONTENT
          ===================================================== */}

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              aria-controls="app-sidebar"
              aria-expanded={sidebarOpen}
            >
              <Icon name="menu" size={18} />
            </button>

            <div className="topbar-title">
              <strong>{pageTitle}</strong>
              <span>AI-powered Ayurvedic knowledge assistant</span>
            </div>
          </div>

          <div className="topbar-actions">
            <span className="topbar-pill">{currentCountry?.name}</span>
            <span className="topbar-pill">{currentLanguage?.name}</span>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setStep("country")}
            >
              Change
            </button>
          </div>
        </header>

        {/* ===================================================
            HOME
            =================================================== */}

        {page === "home" && (
          <div className="page-scroll">
            <section className="home">
              <div className="hero">
                <div className="hero-badge">
                  <Icon name="spark" size={13} />
                  AI-powered Ayurveda
                </div>

                <h1>
                  Your <span>Ayurveda Assistant</span>
                </h1>

                <p>
                  Search Ayurvedic knowledge, explore trusted references, and
                  get concise AI-powered answers grounded in the AYURNEX
                  knowledge base.
                </p>

                <div className="hero-search">
                  <Icon name="search" size={18} />

                  <input
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Ask anything about Ayurveda..."
                    aria-label="Ask anything about Ayurveda"
                  />

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => submitQuestion()}
                  >
                    Ask AYURNEX
                    <Icon name="arrow" size={16} />
                  </button>
                </div>

                <div className="chips">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="chip"
                      onClick={() => submitQuestion(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon">
                    <Icon name="spark" size={18} />
                  </div>
                  <h3>Clear Answers</h3>
                  <p>
                    Get concise and easy-to-understand answers to your
                    Ayurvedic questions.
                  </p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">
                    <Icon name="doc" size={18} />
                  </div>
                  <h3>Source Grounded</h3>
                  <p>
                    Answers are supported by the documents available in the
                    AYURNEX knowledge base.
                  </p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">
                    <Icon name="chat" size={18} />
                  </div>
                  <h3>Chat History</h3>
                  <p>
                    Keep your previous questions available in the sidebar for
                    easy follow-up.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ===================================================
            ASK / CHAT
            =================================================== */}

        {page === "ask" && (
          <section className="chat-view">
            <div className="chat-main">
              <div className="chat-scroll" ref={scrollRef}>
                <div className="chat-thread">
                  {chatIsEmpty ? (
                    <div className="empty-chat">
                      <div className="empty-chat-icon">
                        <Icon name="leaf" size={24} />
                      </div>

                      <h2>What would you like to know?</h2>

                      <p>
                        Ask AYURNEX about Ayurvedic herbs, traditional
                        practices, remedies, concepts, or other topics covered
                        by the knowledge base.
                      </p>

                      <div className="chips">
                        {SUGGESTIONS.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            className="chip"
                            onClick={() => submitQuestion(suggestion)}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {activeChat.messages.map((message) => {
                        const isAssistant = message.role === "assistant";
                        const messageSources = isAssistant
                          ? dedupeSources(message.sources)
                          : [];

                        return (
                          <div
                            key={message.id}
                            className={`message-row ${message.role}`}
                          >
                            <div className={`message ${message.role}`}>
                              {isAssistant && (
                                <div className="assistant-header">
                                  <span className="assistant-avatar">
                                    <Icon name="leaf" size={11} />
                                  </span>
                                  AYURNEX
                                </div>
                              )}

                              {message.role === "user" ? (
                                <div className="message-text">
                                  {message.content}
                                </div>
                              ) : (
                                <div className="answer-content">
                                  <ReactMarkdown>
                                    {message.content}
                                  </ReactMarkdown>
                                </div>
                              )}

                              {messageSources.length > 0 && (
                                <div className="message-sources">
                                  {/* Desktop: selects what the right panel shows */}
                                  <button
                                    type="button"
                                    className={`sources-toggle${
                                      panel.message?.id === message.id
                                        ? " active"
                                        : ""
                                    }`}
                                    aria-pressed={
                                      panel.message?.id === message.id
                                    }
                                    onClick={() =>
                                      setSourceMessageId(message.id)
                                    }
                                  >
                                    <Icon name="doc" size={14} />
                                    {messageSources.length} source
                                    {messageSources.length === 1 ? "" : "s"}
                                  </button>

                                  {/* Tablet / mobile: collapsible section below the response */}
                                  <details className="inline-sources">
                                    <summary>
                                      <Icon name="doc" size={15} />
                                      Sources
                                      <span className="count-badge">
                                        {messageSources.length}
                                      </span>
                                      <Icon
                                        name="chevron"
                                        size={16}
                                        className="chevron"
                                      />
                                    </summary>

                                    <div className="inline-sources-list">
                                      {messageSources.map((source, index) => (
                                        <SourceCard
                                          key={source.key}
                                          source={source}
                                          index={index}
                                        />
                                      ))}
                                    </div>
                                  </details>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {loading && (
                        <div className="message-row assistant">
                          <div className="message assistant">
                            <div className="assistant-header">
                              <span className="assistant-avatar">
                                <Icon name="leaf" size={11} />
                              </span>
                              AYURNEX
                            </div>

                            <div className="loader" aria-label="Thinking">
                              <span />
                              <span />
                              <span />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {error && (
                    <div className="error-message" role="alert">
                      {error}
                    </div>
                  )}
                </div>
              </div>

              {/* ---------- CHAT INPUT ---------- */}

              <div className="composer-wrap">
                <div className="composer">
                  <textarea
                    ref={textareaRef}
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Ask AYURNEX anything about Ayurveda..."
                    rows={1}
                    aria-label="Your question"
                  />

                  <button
                    type="button"
                    className="composer-send"
                    onClick={() => submitQuestion()}
                    disabled={loading || !question.trim()}
                    aria-label="Send message"
                  >
                    <Icon name="send" size={18} />
                  </button>
                </div>

                <div className="composer-note">
                  AYURNEX provides educational information, not personalized
                  medical advice.
                </div>
              </div>
            </div>

            {/* =================================================
                RIGHT SOURCES PANEL (wide desktop)
                ================================================= */}

            <aside className="sources-panel" aria-label="Sources">
              <div className="sources-header">
                <div className="sources-heading">
                  <strong>Sources</strong>
                  <span className="count-badge">{panel.sources.length}</span>
                </div>

                <p className="sources-subtitle">
                  {panel.question
                    ? `For: “${truncate(panel.question, 90)}”`
                    : "Retrieved for the current response"}
                </p>
              </div>

              {panel.sources.length === 0 ? (
                <div className="no-sources">
                  {panel.message
                    ? "No sources were returned for this response."
                    : "Sources for your answers will appear here after you ask a question."}
                </div>
              ) : (
                <div className="sources-list">
                  {panel.sources.map((source, index) => (
                    <SourceCard
                      key={source.key}
                      source={source}
                      index={index}
                    />
                  ))}
                </div>
              )}
            </aside>
          </section>
        )}

        {/* ===================================================
            ABOUT
            =================================================== */}

        {page === "about" && (
          <div className="page-scroll">
            <section className="internal-page">
              <div className="page-heading">
                <h1>About AYURNEX</h1>
                <p>
                  An AI-powered Ayurvedic knowledge assistant built around
                  retrieval-grounded information.
                </p>
              </div>

              <div className="info-card">
                <h2>What is AYURNEX?</h2>

                <p>
                  AYURNEX helps users explore Ayurvedic information through a
                  conversational interface. Questions are matched against the
                  AYURNEX knowledge base and the retrieved information is used
                  to generate an answer.
                </p>
              </div>

              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon">
                    <Icon name="search" size={18} />
                  </div>
                  <h3>Semantic Retrieval</h3>
                  <p>
                    Questions are converted into embeddings and matched
                    against relevant knowledge chunks.
                  </p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">
                    <Icon name="doc" size={18} />
                  </div>
                  <h3>Source Attribution</h3>
                  <p>
                    Retrieved document information is shown alongside the
                    answer for transparency.
                  </p>
                </div>

                <div className="feature-card">
                  <div className="feature-icon">
                    <Icon name="shield" size={18} />
                  </div>
                  <h3>Safety Focus</h3>
                  <p>
                    The assistant is designed to distinguish traditional
                    information from modern medical claims.
                  </p>
                </div>
              </div>

              <div className="info-card note">
                <h2>Educational use only</h2>

                <p>
                  AYURNEX provides educational information, not personalized
                  medical advice. Consult a qualified healthcare professional
                  for health decisions.
                </p>
              </div>
            </section>
          </div>
        )}

        {/* ===================================================
            RESOURCES
            =================================================== */}

        {page === "resources" && (
          <div className="page-scroll">
            <section className="internal-page">
              <div className="page-heading">
                <h1>Knowledge Resources</h1>

                <p>
                  Sources retrieved during your AYURNEX conversations are
                  collected here.
                </p>
              </div>

              {allSources.length === 0 ? (
                <div className="info-card">
                  <h2>No resources yet</h2>
                  <p>
                    Ask a question first. The documents used to answer your
                    question will appear here.
                  </p>
                </div>
              ) : (
                <div className="resources-grid">
                  {allSources.map((source, index) => (
                    <SourceCard
                      key={source.key}
                      source={source}
                      index={index}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;