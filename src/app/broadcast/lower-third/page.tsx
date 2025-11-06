'use client';
import React from 'react';
import { useStateData } from '../_useStateData';

export default function LowerThird() {
  const { burnsSorted } = useStateData();
  const feed = (burnsSorted.slice(0, 14).length ? burnsSorted.slice(0, 14) : [{ id:'seed', amount:0, timestamp: Date.now(), tx:'#' }]) as any[];
  const items = [...feed, ...feed];

  return (
    <div style={{
      position:'fixed', inset:0, background:'transparent',
      display:'grid', alignItems:'end', pointerEvents:'none'
    }}>
      <div style={{
        margin: '0 24px 20px', padding:'8px 0',
        background:'linear-gradient(0deg, rgba(15,25,20,.85), rgba(15,25,20,.55))',
        border:'1px solid rgba(255,255,255,.08)', borderRadius:14, overflow:'hidden'
      }}>
        <div style={{
          whiteSpace:'nowrap', overflow:'hidden',
          maskImage:'linear-gradient(90deg,transparent,white 6%,white 94%,transparent)'
        }}>
          <div style={{
            display:'inline-flex', gap:22, alignItems:'center',
            paddingLeft:'100%', animation:'scroll 26s linear infinite'
          }}>
            {items.map((b,i)=>(
              <span key={i} style={{
                display:'inline-flex', alignItems:'center', gap:10,
                padding:'6px 12px', borderRadius:999,
                background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.10)',
                fontWeight:800, color:'#fff'
              }}>
                🔥 {Number(b.amount).toLocaleString()} BBURN
                <span style={{opacity:.65,fontWeight:600,fontSize:12}}>
                  {new Date(b.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
    </div>
  );
}
