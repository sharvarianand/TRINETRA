import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0d14',
          borderRadius: '8px',
          border: '1px solid #06b6d4',
          position: 'relative'
        }}
      >
        <svg viewBox="0 0 48 48" style={{ width: '85%', height: '85%' }}>
          {/* Cyber Eye Shape */}
          <path d="M 4 24 Q 24 8 44 24 Q 24 40 4 24 Z" stroke="#06b6d4" strokeWidth="3" fill="none" />
          
          {/* Inner Iris boundary (Red accent) */}
          <circle cx="24" cy="24" r="9" stroke="#ff5258" strokeWidth="2" fill="none" />
          
          {/* Ashoka Chakra (Spokes) */}
          <circle cx="24" cy="24" r="5" stroke="#06b6d4" strokeWidth="3" strokeDasharray="1.5 2" fill="none" />
          
          {/* Center Bindu */}
          <circle cx="24" cy="24" r="2.5" fill="#06b6d4" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
