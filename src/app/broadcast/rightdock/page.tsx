'use client';
import React from 'react';
import { useStateData, fmtInt } from '../_useStateData';

export default function RightDock() {
  const { BURNED, CURRENT, burnsSorted } = useStateData();
  const latest = burnsSorted.slice(0, 6);

  return (
    <div style={{ position:'fixed', inset:0, background:'transparent', pointerEvents:'none' }}>
      <aside style={{
        position:'absolute', right:16, top:16, bottom:16, width:340,
        display:'grid', gridTemplateRows:'auto 1fr', gap:12, color:'#fff',
        background:'linear-gradient(180deg, rgba(15,25,20,.85), rgba(15,25,20,.55))',
        border:'1px solid rgba(255,255,255,.08)', borderRadius:16, padding:14
      }}>
        <div style={{ display:'grid', gap:8 }}>
          <Big label="Burned" value={fmtInt(BURNED)} />
          <Big label="Supply" value={fmtInt(CURRENT)} />
        </div>
        <div style={{
          overflow:'auto', padding:8, background:'rgba(255,255,255,.04)',
          border:'1px solid rgba(255,255,255,.08)', borderRadius:12
        }}>
          <div style={{fontSize:12,opacity:.7,letterSpacing:1,textTransform:'uppercase',marginBottom:8}}>
            Recent Burns
          </div>
          <div style={{display:'grid',gap:8}}>
            {latest.map((b,i)=>(
              <div key={i} style={{
                display:'flex',justifyContent:'space-between',alignItems:'center',
                padding:'8px 10px', borderRadius:10, background:'rgba(255,255,255,.06)',
                border:'1px solid rgba(255,255,255,.10)'
              }}>
                <span>🔥 {Number(b.amount).toLocaleString()} BBURN</span>
                <span style={{opacity:.7, fontSize:12}}>
                  {new Date((b as any).timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                </span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display:'grid', gap:2, padding:'10px 12px', borderRadius:12,
      background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.10)'
    }}>
      <div style={{fontSize:12,opacity:.7,letterSpacing:1,textTransform:'uppercase'}}>{label}</div>
      <div style={{fontSize:28,fontWeight:900}}>{value}</div>
    </div>
  );
}
