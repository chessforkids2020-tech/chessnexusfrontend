import React, { useState } from "react";
import api from '../api';
import "./HomePage.css"; // include CSS for contact section

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
    <div style={styles.container}>
      <h1>Contact Us</h1>
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
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
  },
};