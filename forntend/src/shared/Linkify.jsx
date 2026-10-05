import React from 'react'
import { sessionAPI } from '../services/api'

const URL_REGEX = /(https?:\/\/[^\s]+)/g

// Turns any http(s) URL inside a piece of text into a clickable hyperlink.
// `onLinkClick` (optional) runs when a link is clicked.
export default function Linkify({ text = '', color = '#2563eb', onLinkClick }) {
  const parts = String(text).split(URL_REGEX)
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => { e.stopPropagation(); if (onLinkClick) onLinkClick() }}
            style={{ color, textDecoration: 'underline', fontWeight: 600, wordBreak: 'break-all' }}
          >
            {part}
          </a>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  )
}

// Notification metadata may arrive as an object or a JSON string
function parseMeta(n) {
  let meta = n?.metadata
  if (typeof meta === 'string') {
    try { meta = JSON.parse(meta) } catch { meta = null }
  }
  return meta || {}
}

// Finds the meeting link of a notification
export function getMeetingLink(n) {
  const meta = parseMeta(n)
  if (meta.meetingLink) return meta.meetingLink
  if (n?.type === 'session_started') {
    const m = String(n.body || '').match(URL_REGEX)
    return m ? m[0] : null
  }
  return null
}

// Called when a student joins a meeting from a notification:
// marks the session as joined on the server and tells the UI to drop it from "Upcoming Sessions"
export function joinMeeting(n) {
  const sessionId = parseMeta(n).sessionId
  if (!sessionId) return
  window.dispatchEvent(new CustomEvent('session:joined', { detail: { sessionId } }))
  sessionAPI.join(sessionId).catch(() => {})
}
