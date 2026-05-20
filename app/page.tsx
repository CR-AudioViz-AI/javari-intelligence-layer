// app/page.tsx — javari-intelligence-layer
// CR AudioViz AI · EIN: 39-3646201 · May 2026
'use client'
export default function Page() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
      <div style={{ textAlign: 'center', maxWidth: 560, padding: '40px 24px' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>🧠</div>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 16px', color: '#fff' }}>Javari Intelligence</h1>
        <p style={{ fontSize: 16, color: '#9ca3af', lineHeight: 1.65, margin: '0 0 32px' }}>AI intelligence layer — model routing, inference, and orchestration.</p>
        <a href="https://craudiovizai.com/auth/signup"
          style={{ background: '#7c3aed', color: '#000', borderRadius: 10, padding: '14px 32px', fontSize: 15, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
          Get Started Free →
        </a>
        <p style={{ marginTop: 16, fontSize: 12, color: '#374151' }}>
          Part of the CR AudioViz AI platform · <a href="https://craudiovizai.com" style={{ color: '#6366f1', textDecoration: 'none' }}>craudiovizai.com</a>
        </p>
      </div>
    </div>
  )
}
