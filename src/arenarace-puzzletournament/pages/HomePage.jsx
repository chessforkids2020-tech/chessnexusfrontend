import React, { useEffect, useState } from "react";
import api from '../api';
import { useAuth } from "../contexts/AuthContext";
import "./HomePage.css"; // include CSS for slider + sections

// ✅ Slider Component
const sliderImages = [
  "/slider/slider1.jpg",
  "/slider/slider2.jpg",
  "/slider/slider3.jpg",
  "/slider/slider4.jpg",

];

function ImageSlider() {
  const [current, setCurrent] = useState(0);

  const nextSlide = () => setCurrent((prev) => (prev + 1) % sliderImages.length);
  const prevSlide = () => setCurrent((prev) => (prev - 1 + sliderImages.length) % sliderImages.length);

  useEffect(() => {
    const timer = setInterval(nextSlide, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fullpage-slider">
      <div 
        className="slider-blur-bg" 
        style={{ backgroundImage: `url(${sliderImages[current]})` }}
      ></div>
      <button className="slider-arrow left" onClick={prevSlide}>
        &lt;
      </button>
      <img
        src={sliderImages[current]}
        alt={`Slide ${current + 1}`}
        className="fullpage-image"
      />
      <button className="slider-arrow right" onClick={nextSlide}>
        &gt;
      </button>
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();

  // Remove global header padding for homepage to have slider start right after header
  useEffect(() => {
    document.body.classList.add('no-header-padding');
    return () => {
      document.body.classList.remove('no-header-padding');
    };
  }, []);
  // New contact form state and handler
  const [newContact, setNewContact] = useState({ name: '', email: '', message: '' });
  const [contactStatus, setContactStatus] = useState('');
  const handleNewContactSubmit = async (e) => {
    e.preventDefault();
    setContactStatus('');
    try {
      const res = await api.post('/api/public/contact', newContact);
      if (res.data && res.data.ok) {
        setContactStatus('Message sent successfully!');
        setNewContact({ name: '', email: '', message: '' });
      } else {
        setContactStatus('Failed to send message. Please try again.');
      }
    } catch (err) {
      setContactStatus('Failed to send message. Please try again.');
    }
  };

  return (
    <div style={styles.container}>
      {/* ✅ Full-width slider */}
      <ImageSlider />

      {/* Hero Content Section */}
      <div className="hero-content">
        <div className="hero-container">
          <h1 className="hero-main-title">Chess Nexus | Chess Puzzle Arena for Kids</h1>
          <h2 className="hero-subtitle">Timed Puzzle Races, Arena Races & Chess Challenges</h2>

          <div className="hero-description-diagonal">
            <div className="diagonal-section">
              <div className="diagonal-inner">
                <div className="diagonal-icon-area">
                  <span className="diagonal-icon">🎯</span>
                  <div className="diagonal-number">1</div>
                </div>
                <div className="diagonal-content">
                  <h3 className="diagonal-title">Puzzle Arena</h3>
                  <p className="diagonal-text">
                    Welcome to Chess Nexus, a competitive and fun chess puzzle platform built
                    especially for kids. Our Chess Puzzle Arena lets young players race against
                    time with exciting puzzles that boost thinking speed, accuracy, and confidence.
                  </p>
                </div>
              </div>
            </div>

            <div className="diagonal-section">
              <div className="diagonal-inner">
                <div className="diagonal-icon-area">
                  <span className="diagonal-icon">⚡</span>
                  <div className="diagonal-number">2</div>
                </div>
                <div className="diagonal-content">
                  <h3 className="diagonal-title">Compete in Exciting Races</h3>
                  <p className="diagonal-text">
                    Players can compete in individual puzzle races, team puzzle battles, and timed
                    arena races. Each challenge is time-based, encouraging quick calculation and
                    smart decision-making under pressure.
                  </p>
                </div>
              </div>
            </div>

            <div className="diagonal-section">
              <div className="diagonal-inner">
                <div className="diagonal-icon-area">
                  <span className="diagonal-icon">📘</span>
                  <div className="diagonal-number">3</div>
                </div>
                <div className="diagonal-content">
                  <h3 className="diagonal-title">Structured Study</h3>
                  <p className="diagonal-text">
                    Chess Nexus combines competition with learning through structured study chapters,
                    interactive tests, and detailed performance results — helping kids improve faster
                    while staying motivated.
                  </p>
                </div>
              </div>
            </div>

            <div className="diagonal-section">
              <div className="diagonal-inner">
                <div className="diagonal-icon-area">
                  <span className="diagonal-icon">🏆</span>
                  <div className="diagonal-number">4</div>
                </div>
                <div className="diagonal-content">
                  <h3 className="diagonal-title">Tournament Experience</h3>
                  <p className="diagonal-text">
                    With puzzle tournaments, leaderboards, and live race tracking, admins can manage
                    events in real time to ensure fair play and a smooth, safe experience for every
                    participant.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="quick-access">
  <h3 className="quick-title">Quick Access</h3>

  <div className="quick-buttons">
    {!user && (
      <a href="/login" className="quick-btn">
        🔐 Login
      </a>
    )}

    <a href="/dashboard" className="quick-btn">
      📊 Dashboard
    </a>

    <a href="/scoreboard" className="quick-btn">
      🏆 Scoreboard
    </a>

    <a href="/contest-rules" className="quick-btn">
      📋 Contest 2025
    </a>
  </div>
</div>


      {/* ✅ Image + Text Section */}
      <div className="extra-section">
        <div className="image-section">
          <img
            src="/images/chess-training.jpg"
            alt="Chess Training"
            className="info-image"
          />
        </div>

        <div className="text-section">
          <h2>🌟 Puzzle Challenge 2025 🌍</h2>
          <p>
            Get ready to test your chess skills and have fun! The Chess for Kids
            Facebook group is hosting the Global Chess Puzzle Competition,
            open to young players from all over the world. The event has two levels — 
            Beginner and Intermediate — so every player can shine at their own pace. 
            Players will solve interesting chess puzzles that help them think smarter and play better. 
            The Top 3 winners in each level will be named the “Stars of Chess for Kids 2026” and will be celebrated 
            in our community for their talent and effort. Join us, challenge yourself, and be part of a worldwide celebration 
            of learning, logic, and the love of chess! ♟️✨
          </p>
          <button
            className="facebook-btn"
            onClick={() => {
              window.open("https://www.facebook.com/groups/322969172162306", "_blank");
            }}
          >
            📘 Visit Facebook Group
          </button>
        </div>
      </div>

      {/* --- Contest Rules Section --- */}
      <div className="extra-section">
        <div className="text-section">
          <h2>📜 Contest Rules</h2>
          <ol>
            <li>Kids should not turn off video or mute during the contest.</li>
            <li>This contest will be held live online via Zoom. Video must cover the full view of the participant (not just the head).</li>
            <li>External assistance is strictly not allowed.</li>
            <li>Participants should not speak to anyone (friends or family) during the contest.</li>
            <li>If you cannot attend the contest at the scheduled time, please notify us in advance to reschedule.</li>
          </ol>
        </div>
        <div className="image-section">
          <img src="/images/chess-rules.jpg" alt="Contest Rules" className="info-image" />
        </div>
      </div>


      {/* ✅ Gallery Section */}
      <div className="gallery-section">
        <h2 className="gallery-title">Gallery</h2>
        <div className="gallery-grid">
          {[1, 3, 4, 5, 6, 7].map((num) => (
            <div key={num} className="gallery-item">
              <img
                src={`/gallery/gallery${num}.jpg`}
                alt={`Gallery ${num}`}
                className="gallery-image"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 📞 New Contact Form Section */}
      <div className="contact-admin">
        <h2 className="contact-header">Contact Admin</h2>
        <div className="contact-grid">
          <div className="contact-box">
            <img
              src="/images/contact-admin.jpg"
              alt="Contact Admin"
              className="contact-image"
            />
          </div>
          <div className="contact-box">
            <h3>Send a Message</h3>
            <form className="contact-form" onSubmit={handleNewContactSubmit}>
              <div className="form-group">
                <label htmlFor="new-name">Name</label>
                <input
                  type="text"
                  id="new-name"
                  value={newContact.name}
                  onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="new-email">Email</label>
                <input
                  type="email"
                  id="new-email"
                  value={newContact.email}
                  onChange={e => setNewContact({ ...newContact, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="new-message">Message</label>
                <textarea
                  id="new-message"
                  value={newContact.message}
                  onChange={e => setNewContact({ ...newContact, message: e.target.value })}
                  rows="4"
                  required
                ></textarea>
              </div>
              <button type="submit" className="submit-btn">Send Message</button>
              {contactStatus && <p className="submit-message">{contactStatus}</p>}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    margin: 0,
    padding: 0,
    width: "100%",
    overflowX: "hidden",
  },
  title: {
    fontSize: "36px",
    color: "#ff6b6b",
    fontWeight: "700",
    textAlign: "center",
    marginTop: "20px",
    textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
    fontFamily: "'Poppins', sans-serif",
  },
  subtitle: {
    fontSize: "18px",
    color: "#333",
    marginTop: "10px",
    marginBottom: "40px",
    textAlign: "center",
    fontFamily: "'Poppins', sans-serif",
  },
  navSection: {
    textAlign: "center",
    margin: "30px 0",
  },
  navTitle: {
    fontSize: "20px",
    color: "#ff6b6b",
    marginBottom: "15px",
    fontFamily: "'Poppins', sans-serif",
    fontWeight: "600",
  },
  navButtons: {
    display: "flex",
    justifyContent: "center",
    gap: "15px",
    flexWrap: "wrap",
  },
  navBtn: {
    padding: "10px 20px",
    background: "linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%)",
    color: "white",
    textDecoration: "none",
    borderRadius: "25px",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
    border: "none",
    cursor: "pointer",
    display: "inline-block",
    boxShadow: "0 8px 25px rgba(255, 107, 107, 0.4)",
    fontFamily: "'Poppins', sans-serif",
  },
};
