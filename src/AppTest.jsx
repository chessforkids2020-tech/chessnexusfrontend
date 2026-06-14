import React from "react";
import { Routes, Route, Link } from "react-router-dom";

function TestPage() {
  return <div>Test Page Works!</div>;
}

function HomePage() {
  return (
    <div>
      <h1>Home Page</h1>
      <Link to="/test">Go to Test Page</Link>
    </div>
  );
}

export default function AppTest() {
  return (
    <div>
      <h1>Router Test</h1>
      <nav>
        <Link to="/">Home</Link> | <Link to="/test">Test</Link>
      </nav>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/test" element={<TestPage />} />
      </Routes>
    </div>
  );
}