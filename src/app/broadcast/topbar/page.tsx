'use client';
import React, { useMemo } from 'react';
import { useStateData, fmtInt } from '../_useStateData';

export default function Topbar() {
  const { BURNED, CURRENT, nextBurnMs } = useStateData();
  const segs = useMemo(()=>{
    const t = Math.max(0, Math.floor(nextBurnMs/1000));
    const h = Math.floor(t/3600), m=Math.floor((t%3600)/60), s=t%60;
    return { h:String(h), m:m.toString().padStart(2,'0'), s:s.toString().padStart(2,'0') };
  },[nextBurnMs]);

  const pill: React.CSSProperties = {
    display:'inline-flex', alignItems:'center', justifyContent:'center',
    minWidth:44, padding:'6px 10px', borderRadius:10,
    background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.12)',
    fontSize:20, fontWeight:800, lineHeight:1
  };

  return (
    <div style={{
      position:'fixed', inset:0, background:'transparent', pointerEvents:'none',
      display:'grid', alignItems:'start'
    }}>
      <div style={{
        margin:'16px 18px', padding:'10px 14px',
        background:'linear-gradient(180deg, rgba(15,25,20,.85), rgba(15,25,20,.55))',
        border:'1px solid rgba(255,255,255,.08)', borderRadius:14,
        display:'flex', justifyContent:'space-between', alignItems:'center', color:'#fff'
      }}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <img src="/img/coin-logo.png" alt="$BBURN" style={{width:32,height:32,borderRadius:999,border:'1px solid rgba(255,200,120,.35)'}}/>
          <div style={{fontWeight:800}}>The Burning Bear • $BBURN</div>
        </div>
        <div style={{display:'flex',gap:16,alignItems:'center',fontWeight:800}}>
          <span>Burned: {fmtInt(BURNED)}</span>
          <span>Supply: {fmtInt(CURRENT)}</span>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:12,opacity:.7,letterSpacing:1,textTransform:'uppercase',marginRight:6}}>Next Burn</span>
            <span style={pill}>{segs.h}</span><span>:</span><span style={pill}>{segs.m}</span><span>:</span><span style={pill}>{segs.s}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
