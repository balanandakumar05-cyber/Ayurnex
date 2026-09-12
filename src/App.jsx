import { useState } from 'react';
import './App.css';

const countries = [
  {
    code: 'IN',
    flag: '🇮🇳',
    name: 'India',
    description: 'Indian Ayurvedic context',
  },
  {
    code: 'US',
    flag: '🇺🇸',
    name: 'United States',
    description: 'US regulatory context',
  },
  {
    code: 'JP',
    flag: '🇯🇵',
    name: 'Japan',
    description: 'Japanese regulatory context',
  },
];

const languages = [
  {
    code: 'en',
    flag: '🇬🇧',
    name: 'English',
    nativeName: 'English',
  },
  {
    code: 'hi',
    flag: '🇮🇳',
    name: 'Hindi',
    nativeName: 'हिन्दी',
  },
];

const suggestions = [
  'Benefits of Ashwagandha',
  'Uses of Turmeric',
  'Home remedies for cough',
  'Ayurvedic diet for immunity',
];

const features = [
  {
    icon: '✦',
    title: 'AI Answers',
    text: 'Get clear, concise and accurate answers',
  },
  {
    icon: '▢',
    title: 'Trusted Sources',
    text: 'Based on authentic Ayurvedic references',
  },
  {
    icon: '↶',
    title: 'Query History',
    text: 'Access your previous questions',
  },
  {
    icon: '⌁',
    title: 'Explore Knowledge',
    text: 'Learn and discover Ayurveda',
  },
];

function App() {
  /* =========================
     COUNTRY & LANGUAGE
  ========================= */

  const [country, setCountry] = useState(null);
  const [language, setLanguage] = useState(null);

  const [selectionStep, setSelectionStep] = useState('country');

  /* =========================
     APPLICATION
  ========================= */

  const [activePage, setActivePage] = useState('home');

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [history, setHistory] = useState([]);

  const [isLoading, setIsLoading] = useState(false);

  /* =========================
     COUNTRY
  ========================= */

  const handleCountrySelect = (selectedCountry) => {
    setCountry(selectedCountry);
  };

  const handleCountryContinue = () => {
    if (!country) return;

    setSelectionStep('language');
  };

  /* =========================
     LANGUAGE
  ========================= */

  const handleLanguageSelect = (selectedLanguage) => {
    setLanguage(selectedLanguage);
  };

  const handleLanguageContinue = () => {
    if (!language) return;

    setSelectionStep('complete');
    setActivePage('home');
  };

  /* =========================
     CHANGE COUNTRY
  ========================= */

  const changeCountry = () => {
    setSelectionStep('country');
  };

  /* =========================
     CHANGE LANGUAGE
  ========================= */

  const changeLanguage = () => {
    setSelectionStep('language');
  };

  /* =========================
     ASK QUESTION
  ========================= */

  const askQuestion = async (text = question) => {
    const cleanQuestion = text.trim();

    if (!cleanQuestion) return;

    setQuestion(cleanQuestion);
    setActivePage('ask');

    setIsLoading(true);
    setAnswer('');
    setSources([]);

    /*
      TEMPORARY RESPONSE

      Later we will replace this with:

      Backend API
        ↓
      RAG
        ↓
      Gemini
    */

    setTimeout(() => {
      const selectedLanguage = language?.code === 'hi' ? 'Hindi' : 'English';

      setAnswer(
        `AYURNEX received your question for ${country.name} in ${selectedLanguage}. The real AI/RAG response will appear here once the backend is connected.`
      );

      setHistory((oldHistory) => [
        cleanQuestion,
        ...oldHistory.filter((item) => item !== cleanQuestion),
      ]);

      setIsLoading(false);
    }, 700);
  };

  /* =========================
     NAVIGATION
  ========================= */

  const selectPage = (page) => {
    setActivePage(page);

    if (page !== 'ask') {
      setAnswer('');
      setSources([]);
    }
  };

  /* ==================================================
     STEP 1 — COUNTRY SELECTION
  ================================================== */

  if (selectionStep === 'country') {
    return (
      <div className="selection-page">
        <div className="selection-container">
          {/* LOGO */}

          <div className="selection-logo">
            <span>AYUR</span>
            <span className="logo-blue">NEX</span>
          </div>

          {/* SMALL TITLE */}

          <div className="selection-eyebrow">WELCOME TO AYURNEX</div>

          {/* MAIN TITLE */}

          <h1>Select your country</h1>

          <p className="selection-description">
            Choose your country to help AYURNEX provide information using the
            appropriate regional context.
          </p>

          {/* COUNTRY OPTIONS */}

          <div className="selection-options">
            {countries.map((item) => (
              <button
                type="button"
                key={item.code}
                className={`selection-card ${
                  country?.code === item.code ? 'selected' : ''
                }`}
                onClick={() => handleCountrySelect(item)}
              >
                <div className="selection-flag">{item.flag}</div>

                <div className="selection-info">
                  <h2>{item.name}</h2>

                  <p>{item.description}</p>
                </div>

                <div className="selection-check">
                  {country?.code === item.code ? '✓' : ''}
                </div>
              </button>
            ))}
          </div>

          {/* CONTINUE */}

          <button
            type="button"
            className={`selection-continue ${country ? 'enabled' : ''}`}
            onClick={handleCountryContinue}
            disabled={!country}
          >
            Continue
            <span>→</span>
          </button>

          <p className="selection-note">
            You can change your country later from the application.
          </p>
        </div>
      </div>
    );
  }

  /* ==================================================
     STEP 2 — LANGUAGE SELECTION
  ================================================== */

  if (selectionStep === 'language') {
    return (
      <div className="selection-page">
        <div className="selection-container">
          {/* LOGO */}

          <div className="selection-logo">
            <span>AYUR</span>
            <span className="logo-blue">NEX</span>
          </div>

          {/* SMALL TITLE */}

          <div className="selection-eyebrow">ONE MORE STEP</div>

          {/* MAIN TITLE */}

          <h1>Select your language</h1>

          <p className="selection-description">
            Choose the language you would like to use with AYURNEX.
          </p>

          {/* LANGUAGE OPTIONS */}

          <div className="language-options">
            {languages.map((item) => (
              <button
                type="button"
                key={item.code}
                className={`language-card ${
                  language?.code === item.code ? 'selected' : ''
                }`}
                onClick={() => handleLanguageSelect(item)}
              >
                <div className="language-flag">{item.flag}</div>

                <div className="language-info">
                  <h2>{item.name}</h2>

                  <p>{item.nativeName}</p>
                </div>

                <div className="language-check">
                  {language?.code === item.code ? '✓' : ''}
                </div>
              </button>
            ))}
          </div>

          {/* CONTINUE */}

          <button
            type="button"
            className={`selection-continue ${language ? 'enabled' : ''}`}
            onClick={handleLanguageContinue}
            disabled={!language}
          >
            Continue
            <span>→</span>
          </button>

          {/* BACK */}

          <button
            type="button"
            className="back-button"
            onClick={() => setSelectionStep('country')}
          >
            ← Back to country selection
          </button>
        </div>
      </div>
    );
  }

  /* ==================================================
     MAIN APPLICATION
  ================================================== */

  return (
    <div className="app">
      {/* ================= HEADER ================= */}

      <header className="navbar">
        {/* LOGO */}

        <button
          type="button"
          className="logo"
          onClick={() => selectPage('home')}
        >
          <span>AYUR</span>
          <span className="logo-blue">NEX</span>
        </button>

        {/* NAVIGATION */}

        <nav className="nav-links">
          <button
            type="button"
            className={`nav-link ${activePage === 'home' ? 'active' : ''}`}
            onClick={() => selectPage('home')}
          >
            Home
          </button>

          <button
            type="button"
            className={`nav-link ${activePage === 'ask' ? 'active' : ''}`}
            onClick={() => selectPage('ask')}
          >
            Ask
          </button>

          <button
            type="button"
            className={`nav-link ${activePage === 'about' ? 'active' : ''}`}
            onClick={() => selectPage('about')}
          >
            About
          </button>

          <button
            type="button"
            className={`nav-link ${activePage === 'resources' ? 'active' : ''}`}
            onClick={() => selectPage('resources')}
          >
            Resources
          </button>

          {/* COUNTRY */}

          <button
            type="button"
            className="country-mini"
            onClick={changeCountry}
          >
            {country.flag} {country.name}
          </button>

          {/* LANGUAGE */}

          <button
            type="button"
            className="language-mini"
            onClick={changeLanguage}
          >
            {language.flag} {language.name}
          </button>

          {/* SIGN IN */}

          <button
            type="button"
            className="sign-in"
            onClick={() => alert('Sign-in will be connected later.')}
          >
            Sign In
          </button>
        </nav>
      </header>

      {/* ================= HOME ================= */}

      {activePage === 'home' && (
        <main className="home-page">
          <section className="hero">
            <div className="eyebrow">AI-POWERED AYURVEDA</div>

            <h1>
              Your AI-Powered
              <br />
              <span>Ayurveda Assistant</span>
            </h1>

            <p className="hero-description">
              Search Ayurvedic knowledge, get reliable AI-powered answers,
              <br className="desktop-break" />
              and explore verified traditional wisdom.
            </p>

            {/* SEARCH */}

            <div className="search-box">
              <span className="search-icon">⌕</span>

              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    askQuestion();
                  }
                }}
                placeholder="Ask anything about Ayurveda..."
              />

              <button
                type="button"
                className="ask-button"
                onClick={() => askQuestion()}
              >
                Ask AYURNEX
                <span>→</span>
              </button>
            </div>

            {/* SUGGESTIONS */}

            <div className="try-section">
              <strong>Try asking:</strong>

              <div className="suggestions">
                {suggestions.map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => askQuestion(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* FEATURES */}

          <section className="features">
            {features.map((feature) => (
              <button
                type="button"
                className="feature-card"
                key={feature.title}
                onClick={() => {
                  if (feature.title === 'AI Answers') {
                    selectPage('ask');
                  } else {
                    alert(
                      `${feature.title} will be expanded in the next stage.`
                    );
                  }
                }}
              >
                <div className="feature-icon">{feature.icon}</div>

                <h3>{feature.title}</h3>

                <p>{feature.text}</p>
              </button>
            ))}
          </section>
        </main>
      )}

      {/* ================= ASK ================= */}

      {activePage === 'ask' && (
        <main className="content-page">
          <section className="ask-page">
            <div className="eyebrow">AYURNEX ASSISTANT</div>

            <h2>Ask about Ayurveda</h2>

            <p className="page-description">
              Ask a question and AYURNEX will return an AI-generated,
              source-based response.
            </p>

            <div className="large-search">
              <input
                autoFocus
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    askQuestion();
                  }
                }}
                placeholder="e.g. What are the traditional uses of Ashwagandha?"
              />

              <button type="button" onClick={() => askQuestion()}>
                Ask AYURNEX →
              </button>
            </div>

            {/* LOADING */}

            {isLoading && (
              <div className="response-card">
                <div className="loader"></div>

                <p>Thinking...</p>
              </div>
            )}

            {/* RESPONSE */}

            {!isLoading && answer && (
              <div className="response-card">
                <div className="response-label">AI RESPONSE</div>

                <p>{answer}</p>

                <div className="sources">
                  <strong>Sources</strong>

                  <p>
                    {sources.length > 0
                      ? sources.join(', ')
                      : 'Sources from the RAG knowledge base will appear here.'}
                  </p>
                </div>
              </div>
            )}

            {/* HISTORY */}

            {history.length > 0 && (
              <div className="history-card">
                <h3>Recent Questions</h3>

                {history.slice(0, 5).map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => askQuestion(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      {/* ================= ABOUT ================= */}

      {activePage === 'about' && (
        <main className="content-page">
          <section className="info-page">
            <div className="eyebrow">ABOUT AYURNEX</div>

            <h2>Making Ayurvedic knowledge easier to explore.</h2>

            <p>
              AYURNEX is designed as an AI-powered interface for exploring
              Ayurvedic knowledge through natural-language questions.
            </p>

            <p>
              The selected country helps the system provide appropriate regional
              context.
            </p>
          </section>
        </main>
      )}

      {/* ================= RESOURCES ================= */}

      {activePage === 'resources' && (
        <main className="content-page">
          <section className="info-page">
            <div className="eyebrow">RESOURCES</div>

            <h2>Ayurvedic Knowledge Resources</h2>

            <p>
              This section can later display references and documents returned
              by the RAG pipeline.
            </p>

            <div className="resource-placeholder">
              RAG sources and reference documents will appear here.
            </div>
          </section>
        </main>
      )}
    </div>
  );
}

export default App;
