import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

export default function DisplayBoard() {
  const { doctorId } = useParams();
  const [data, setData] = useState(null);
  const [time, setTime] = useState(new Date());
  const [blink, setBlink] = useState(false);
  const prevToken = useRef(null);
  const apiBaseUrl = (process.env.REACT_APP_API_URL || 'https://mediqserver.onrender.com/api').replace(/\/$/, '');

  useEffect(() => {
    const es = new EventSource(`${apiBaseUrl}/display/sse/${doctorId}`);
    es.onmessage = (e) => {
      const d = JSON.parse(e.data);
      if (!d.error) {
        if (prevToken.current !== null && d.serving?.token !== prevToken.current) {
          setBlink(true);
          setTimeout(() => setBlink(false), 3000);
        }
        prevToken.current = d.serving?.token || null;
        setData(d);
      }
    };
    return () => es.close();
  }, [doctorId, apiBaseUrl]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (d) =>
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (!data) {
    return (
      <div style={styles.root}>
        <div style={styles.loading}>Connecting to queue...</div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.hospitalName}>MediQueue</div>
          <div style={styles.doctorName}>{data.doctorName}</div>
          <div style={styles.specialty}>{data.specialty}</div>
        </div>
        <div style={styles.clock}>{fmt(time)}</div>
      </div>

      {/* Now serving — giant token */}
      <div style={{ ...styles.servingBox, ...(blink ? styles.blink : {}) }}>
        <div style={styles.servingLabel}>Now serving</div>
        {data.serving ? (
          <>
            <div style={styles.bigToken}>{data.serving.token}</div>
            <div style={styles.servingName}>{data.serving.name || 'Patient'}</div>
          </>
        ) : (
          <div style={styles.bigToken}>—</div>
        )}
      </div>

      {/* Next 3 */}
      <div style={styles.nextSection}>
        <div style={styles.nextLabel}>Up next</div>
        <div style={styles.nextGrid}>
          {data.next3.length === 0 && (
            <div style={styles.emptyNext}>No patients waiting</div>
          )}
          {data.next3.map((n, i) => (
            <div key={n.token} style={{ ...styles.nextCard, opacity: 1 - i * 0.18 }}>
              <div style={styles.nextToken}>{n.token}</div>
              <div style={styles.nextEta}>~{n.eta ?? (i + 1) * (data.avgConsultTime || 10)} min</div>
            </div>
          ))}
          {Array.from({ length: Math.max(0, 3 - data.next3.length) }).map((_, i) => (
            <div key={`empty-${i}`} style={{ ...styles.nextCard, opacity: 0.2 }}>
              <div style={styles.nextToken}>—</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div style={styles.statsBar}>
        <div style={styles.stat}>
          <div style={styles.statVal}>{data.waitingCount}</div>
          <div style={styles.statKey}>Waiting</div>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.stat}>
          <div style={styles.statVal}>{data.doneCount}</div>
          <div style={styles.statKey}>Served today</div>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.stat}>
          <div style={styles.statVal}>~{data.avgConsultTime} min</div>
          <div style={styles.statKey}>Avg consult</div>
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        Please wait at the seating area · You will be called by name and token number
      </div>
    </div>
  );
}

const C = {
  bg: '#0a1628',
  surface: '#0f2040',
  border: 'rgba(255,255,255,0.08)',
  primary: '#1D9E75',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.5)',
};

const styles = {
  root: {
    minHeight: '100vh',
    background: C.bg,
    color: C.text,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    padding: '32px 40px',
    gap: 24,
  },
  loading: {
    margin: 'auto',
    fontSize: 28,
    color: C.muted,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 24,
    borderBottom: `1px solid ${C.border}`,
  },
  hospitalName: {
    fontSize: 18,
    color: C.primary,
    fontWeight: 500,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  doctorName: { fontSize: 32, fontWeight: 500, marginTop: 4 },
  specialty: { fontSize: 16, color: C.muted, marginTop: 4 },
  clock: {
    fontSize: 48,
    fontWeight: 300,
    fontVariantNumeric: 'tabular-nums',
    color: C.muted,
    letterSpacing: 2,
  },
  servingBox: {
    flex: 1,
    background: C.surface,
    border: `2px solid ${C.primary}`,
    borderRadius: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    transition: 'border-color 0.3s, box-shadow 0.3s',
  },
  blink: {
    borderColor: '#fff',
    boxShadow: `0 0 0 4px ${C.primary}44`,
  },
  servingLabel: {
    fontSize: 18,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginBottom: 16,
  },
  bigToken: {
    fontSize: 160,
    fontWeight: 700,
    lineHeight: 1,
    color: C.primary,
    fontVariantNumeric: 'tabular-nums',
  },
  servingName: {
    fontSize: 32,
    marginTop: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  nextSection: { display: 'flex', flexDirection: 'column', gap: 12 },
  nextLabel: {
    fontSize: 14,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  nextGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 },
  nextCard: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: '24px 16px',
    textAlign: 'center',
  },
  nextToken: { fontSize: 72, fontWeight: 600, fontVariantNumeric: 'tabular-nums' },
  nextEta: { fontSize: 16, color: C.muted, marginTop: 8 },
  emptyNext: { color: C.muted, fontSize: 18, padding: '40px 0', gridColumn: '1/-1', textAlign: 'center' },
  statsBar: {
    display: 'flex',
    background: C.surface,
    borderRadius: 14,
    padding: '20px 40px',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  stat: { textAlign: 'center' },
  statVal: { fontSize: 36, fontWeight: 500, color: C.primary },
  statKey: { fontSize: 13, color: C.muted, marginTop: 4 },
  statDivider: { width: 1, height: 40, background: C.border },
  footer: {
    textAlign: 'center',
    fontSize: 14,
    color: C.muted,
    letterSpacing: 1,
    paddingTop: 8,
    borderTop: `1px solid ${C.border}`,
  },
};
