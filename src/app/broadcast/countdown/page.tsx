'use client';
import React, { useMemo } from 'react';
import { useStateData } from '../_useStateData';

export default function CountdownSlate() {
  const { nextBurnMs } = useStateData();
  const segs = useMemo(()=>{
    const t = Math.max(0, Math.floor(nextBurnMs/1000));
    const h = Math.floor(t/3600), m = Math.floor((t%3600)/60), s = t%60;
    return { h:String(h), m:m.toString().padStart(2,'0'), s:s.toString().padStart(2,'0') };
  },[nextBurnMs]);

  const box: React.CSSProperties = {
    display:'inline-flex', alignItems:'center', justifyContent:'center',
    minWidth:120, padding:'16px 20px', borderRadius:18,
    background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.14)',
    fontSize:64, fontWeight:900, lineHeight:1
  };

  return (
    <div style={{
      width:'100vw', height:'100vh', background:'transparent',
      display:'grid', placeItems:'center', color:'#fff'
    }}>
      <div style={{display:'flex', alignItems:'center', gap:14}}>
        <span style={{fontSize:18,opacity:.75,letterSpacing:2,textTransform:'uppercase',marginRight:8}}>
          Next Burn
        </span>
        <span style={box}>{segs.h}</span><span>:</span><span style={box}>{segs.m}</span><span>:</span><span style={box}>{segs.s}</span>
      </div>
    </div>
  );
}
