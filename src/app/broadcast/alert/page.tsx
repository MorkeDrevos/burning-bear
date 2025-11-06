'use client';

import { useEffect, useState } from 'react';

export default function AlertToast() {
  // Show via query: /broadcast/alert?show=1  (auto-hides after 4.5s)
  const [show, setShow] = useState(false);
  useEffect(() => {
    const u = new URL(window.location.href);
    if (u.searchParams.get('show') === '1') {
      setShow(true);
      const t = setTimeout(() => setShow(false), 4500);
      return () => clearTimeout(t);
    }
  }, []);

  if (!show) return null;

  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none' }}>
      <div style={{
        position:'absolute', left:'50%', transform:'translateX(-50%)',
        top:24, padding:'10px 14px', borderRadius:14,
        background:'rgba(255,170,70,.12)', color:'#ffeccc',
        border:'1px solid rgba(255,170,70,.35)', fontWeight:900, fontSize:18,
        boxShadow:'0 0 40px rgba(255,170,60,.25)'
      }}>
        🔥 Burn Executed — Supply Down
      </div>
    </div>
  );
}
