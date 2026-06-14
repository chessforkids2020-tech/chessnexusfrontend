// src/pages/EventPage.jsx
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import mockEvents from '../data/mockEvents';
import "./EventPage.css";

// For now we look up event by id from mock list

export default function EventPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const event = mockEvents.find(e => e.id === eventId) || mockEvents[0];

  return (
    <div className="event-page-container">
      <div className="event-card">
        <div className="event-date-badge">{event.date}</div>
        <h1>{event.name}</h1>
        <div className="event-divider" />
        <p className="event-desc">{event.desc}</p>
        <button
          className="btn-primary"
          onClick={() =>
            navigate(`/event/${event.id}/register`, { state: { event } })
          }
        >
          Join Event
        </button>
      </div>
    </div>
  );
}