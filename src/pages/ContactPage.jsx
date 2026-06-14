import React, { useState } from "react";
import api from '../api';
import SEO from '../components/SEO';
import "./ContactPage.css";

export default function ContactPage() {
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
    <div className="contact-page-container">
      <SEO
        title="Contact Us — Chess Nexus"
        description="Get in touch with the Chess Nexus team. Report issues, suggest features, or ask questions about our free online chess platform."
        canonical="/contact"
      />
      <div className="contact-page-content">
        <h1 className="contact-page-title">
          <span className="title-icon">💬</span>
          Contact Us
        </h1>

        <div className="contact-admin-section">

          <div className="contact-grid">
            {/* Form Box */}
            <div className="contact-form-box">
              <h3 className="form-box-title">Send your Message</h3>
              <form className="contact-form" onSubmit={handleNewContactSubmit}>
                <div className="form-group">
                  <label htmlFor="new-name">Name</label>
                  <input
                    type="text"
                    id="new-name"
                    placeholder="Enter your name"
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
                    placeholder="Enter your email"
                    value={newContact.email}
                    onChange={e => setNewContact({ ...newContact, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="new-message">Message</label>
                  <textarea
                    id="new-message"
                    placeholder="Write your message here..."
                    value={newContact.message}
                    onChange={e => setNewContact({ ...newContact, message: e.target.value })}
                    rows="5"
                    required
                  ></textarea>
                </div>
                <button type="submit" className="submit-btn">
                  <span>Send Message</span>
                  <span className="btn-arrow">→</span>
                </button>
                {contactStatus && (
                  <p className={`submit-message ${contactStatus.includes('success') ? 'success' : 'error'}`}>
                    {contactStatus}
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}