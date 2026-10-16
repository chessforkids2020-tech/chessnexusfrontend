import React, { useState } from "react";
import api from '../api';
import SEO from '../components/SEO';
import "./ContactPage.css";
import { t as tr } from '../i18n/LanguageContext';

export default function ContactPage() {
  const [newContact, setNewContact] = useState({ name: '', email: '', message: '' });
  const [contactStatus, setContactStatus] = useState('');

  const handleNewContactSubmit = async (e) => {
    e.preventDefault();
    setContactStatus('');
    try {
      const res = await api.post('/api/public/contact', newContact);
      if (res.data && res.data.ok) {
        setContactStatus(tr('Message sent successfully!'));
        setNewContact({ name: '', email: '', message: '' });
      } else {
        setContactStatus(tr('Failed to send message. Please try again.'));
      }
    } catch (err) {
      setContactStatus(tr('Failed to send message. Please try again.'));
    }
  };

  return (
    <div className="contact-page-container">
      <SEO
        title={tr("Contact Us — Chess Nexus")}
        description={tr("Get in touch with the Chess Nexus team. Report issues, suggest features, or ask questions about our free online chess platform.")}
        canonical="/contact"
      />
      <div className="contact-page-content">
        <h1 className="contact-page-title">
          <span className="title-icon">💬</span>
          {tr("Contact Us")}
        </h1>

        <div className="contact-admin-section">

          <div className="contact-grid">
            {/* Form Box */}
            <div className="contact-form-box">
              <h3 className="form-box-title">{tr("Send your Message")}</h3>
              <form className="contact-form" onSubmit={handleNewContactSubmit}>
                <div className="form-group">
                  <label htmlFor="new-name">{tr("Name")}</label>
                  <input
                    type="text"
                    id="new-name"
                    placeholder={tr("Enter your name")}
                    value={newContact.name}
                    onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="new-email">{tr("Email")}</label>
                  <input
                    type="email"
                    id="new-email"
                    placeholder={tr("Enter your email")}
                    value={newContact.email}
                    onChange={e => setNewContact({ ...newContact, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="new-message">{tr("Message")}</label>
                  <textarea
                    id="new-message"
                    placeholder={tr("Write your message here...")}
                    value={newContact.message}
                    onChange={e => setNewContact({ ...newContact, message: e.target.value })}
                    rows="5"
                    required
                  ></textarea>
                </div>
                <button type="submit" className="submit-btn">
                  <span>{tr("Send Message")}</span>
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