import React, { useState, useEffect } from 'react'

/**
 * Resolves full URL for an avatar path or external link.
 * Handles relative paths (/uploads/avatars/...) as well as full URLs and data URIs.
 */
export const getAvatarUrl = (avatar) => {
  if (!avatar || typeof avatar !== 'string') return null
  const trimmed = avatar.trim()
  if (!trimmed) return null
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed
  }
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return `http://localhost:5000${cleanPath}`
}

/**
 * Generates up to 2 uppercase initials from a name or fallback string.
 */
export const getInitials = (name, fallback = 'U') => {
  if (!name || typeof name !== 'string') return fallback
  const clean = name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.)\s+/i, '').trim()
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return fallback
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Standardized User Avatar component.
 * Displays image when avatar is available, falling back smoothly to initials on error or absence.
 */
export default function UserAvatar({
  avatar,
  name,
  size = 40,
  fontSize,
  bg = '#16428c',
  color = '#ffffff',
  className = '',
  style = {},
  imgStyle = {},
  fallback = 'U',
  alt,
}) {
  const [imgError, setImgError] = useState(false)
  const src = getAvatarUrl(avatar)
  const initials = getInitials(name, fallback)
  const calculatedFontSize = fontSize || Math.max(11, Math.round(size * 0.38))

  // Reset imgError if avatar changes
  useEffect(() => {
    setImgError(false)
  }, [avatar])

  const containerStyle = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    borderRadius: '50%',
    background: bg,
    color: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: calculatedFontSize,
    overflow: 'hidden',
    flexShrink: 0,
    userSelect: 'none',
    ...style,
  }

  if (src && !imgError) {
    return (
      <div className={`user-avatar-wrap ${className}`} style={containerStyle}>
        <img
          src={src}
          alt={alt || name || 'User Avatar'}
          onError={() => setImgError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '50%',
            display: 'block',
            ...imgStyle,
          }}
        />
      </div>
    )
  }

  return (
    <div className={`user-avatar-wrap ${className}`} style={containerStyle}>
      {initials}
    </div>
  )
}
