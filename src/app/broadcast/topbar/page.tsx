'use client';

import useStateData, { fmtInt, fmtMoney, pad2 } from '../_useStateData';

export default function Topbar() {
  const { data, priceUsdPerSol, nextBurnMs } = useStateData();
  const INITIAL = data?.stats?.initialSupply ?? 0;
  const BURNED = data?.stats?.burned ?? 0;
  const CURRENT = data?.stats?.currentSupply ?? Math.max(0, INITIAL - BURNED);

  const t = Math.max(0, Math.floor((nextBurnMs ?? 0) / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;

  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none' }}>
      <div style={{
        position:'absolute', left:0, right:0, top:0, height:74,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'10px 16px', background:'linear-gradient(180deg, rgba(12,18,15,.88), rgba(12,18,15,.65))',
        borderBottom:'1px solid rgba(255,255,255,.08)', color:'#ffeccc', fontFamily:'Inter, ui-sans-serif'
      }}>
        <strong style={{letterSpacing:.3}}>🔥 The Burning Bear — $BBURN</strong>
        <div style={{ display:'flex', gap:16, color:'rgba(255,255,255,.85)'}}>
          <Pill>Burned: <b>{fmtInt(BURNED)}</b></Pill>
          <Pill>Supply: <b>{fmtInt(CURRENT)}</b></Pill>
          <Pill>SOL: <b>{fmtMoney(priceUsdPerSol)}</b></Pill>
          <Pill>Next Burn: <b>{h}:{pad2(m)}:{pad2(s)}</b></Pill>
        </div>
      </div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:8, padding:'6px 10px',
      background:'rgba(255,215,160,.08)', border:'1px solid rgba(255,215,160,.25)',
      borderRadius:12, fontWeight:600, fontSize:14, lineHeight:1
    }}>{children}</span>
  );
}
