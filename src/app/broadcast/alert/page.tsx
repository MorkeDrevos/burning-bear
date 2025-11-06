'use client';
import React from 'react';

export default function Alert() {
  const show = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('show') === '1' : true;
  if (!show) return null;
  return (
    <div style={{ position:'fixed', inset:0, background:'transparent', pointerEvents:'none' }}>
      <div style={{ position:'absolute', top:24, left:'50%', transform:'translateX(-50%)',
        padding:'10px 14px', borderRadius:12, color:'#ffd9a6',
        background:'rgba(20,12,6,.6)', border:'1px solid rgba(255,200,120,.25)',
        fontWeight:800, boxShadow:'0 0 40px rgba(255,170,60,.25)' }}>
        🔥 Burn Executed — Supply Down
      </div>
    </div>
  );
}
