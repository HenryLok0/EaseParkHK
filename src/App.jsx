import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Main from './components/Main';
import CarparkDetail from './components/Carparkdetail';
import Settings from './components/Settings';
import District from './components/District';
import News from './components/News';
import { Routes, Route } from 'react-router-dom';
import Cameredistrist from './components/Cameredistrist'; // 新增這行

function App() {
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'enabled');
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', darkMode ? 'enabled' : 'disabled');
  }, [darkMode]);

  useEffect(() => {
    if (lang === 'en') {
      document.title = 'EaseParkHK';
    } else {
      document.title = 'EaseParkHK - 泊易香港';
    }
    localStorage.setItem('lang', lang);
  }, [lang]);

  return (
    <>
      <Header
        currentLang={lang}
        onLangChange={setLang}
        onThemeToggle={() => setDarkMode((prev) => !prev)}
        darkMode={darkMode}
      />
      <Routes>
        <Route path="/" element={<Main lang={lang} darkMode={darkMode} />} />
        <Route path="/info/:park_id" element={<CarparkDetail lang={lang} />} />
        <Route path="/settings" element={
          <Settings
            lang={lang}
            onLangChange={setLang}
            darkMode={darkMode}
            onThemeToggle={() => setDarkMode((prev) => !prev)}
          />
        } />
        {/* 只保留一個 district 路由 */}
        <Route path="/district/:key" element={<District lang={lang} />} />
        <Route path="/news" element={<News lang={lang} />} />
        <Route path="/camera/district/:district" element={<Cameredistrist lang={lang} />} />
      </Routes>
    </>
  );
}

export default App;