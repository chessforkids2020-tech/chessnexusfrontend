import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import { t as tr } from './i18n/LanguageContext';

function TestPage() {
  return <div>{tr("Test Page Works!")}</div>;
}

function HomePage() {
  return (
    <div>
      <h1>{tr("Home Page")}</h1>
      <Link to="/test">{tr("Go to Test Page")}</Link>
    </div>
  );
}

export default function AppTest() {
  return (
    <div>
      <h1>{tr("Router Test")}</h1>
      <nav>
        <Link to="/">{tr("Home")}</Link> | <Link to="/test">{tr("Test")}</Link>
      </nav>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/test" element={<TestPage />} />
      </Routes>
    </div>
  );
}