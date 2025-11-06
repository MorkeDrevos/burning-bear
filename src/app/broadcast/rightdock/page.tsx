'use client';

import useStateData, { fmtInt, fmtMoney } from '../_useStateData';

export default function RightDock() {
  const { data, burnsSorted, priceUsdPerSol } = useStateData();
  const INITIAL = data?.stats?.initialSupply ?? 0;
  const BURNED  = data?.stats?.burned ?? 0;
  const CURRENT = data?.stats?.currentSupply ?? Math.max(0, INITIAL - BURNED);

  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none' }}>
      <aside style={{
        position:'absolute', right:0, top:0, bottom:0, width:360,
        background:'linear-gradient(270deg, rgba(12,18,15,.88), rgba(12,18,15,.35))',
        borderLeft:'1px solid rgba(255,255,255,.08)', padding:16, color:'#ffeccc',
        fontFamily:'Inter, ui-sans-serif'
      }}>
        <h3 style={{margin:'4px 0 12px', fontWeight:800}}>🔥 Live Burn Feed</h3>

        <Big label="Burned" value={fmtInt(BURNED)} />
        <Big label="Supply" value={fmtInt(CURRENT)} />
        <Big label="SOL" value={fmtMoney(priceUsdPerSol)} />

        <div style={{marginTop:14, fontSize:13, opacity:.8, fontWeight:700}}>Recent burns</div>
        <div style={{marginTop:8, display:'grid', gap:8, maxHeight:'55vh', overflow:'hidden'}}>
          {burnsSorted.slice(0, 6).map(b => (
            <a key={b.id} href={b.tx} target="_blank" rel="noreferrer" style={{
              pointerEvents:'auto', textDecoration:'none', color:'inherit'
            }}>
              <div style={{
                padding:'10px 12px', borderRadius:12, background:'rgba(255,170,70,.08)',
                border:'1px solid rgba(255,170,70,.22)', display:'grid', gap:4, fontSize:14, fontWeight:700
              }}>
                <div>🔥 {b.amount.toLocaleString()} BBURN</div>
                {typeof b.sol === 'number' && (
                  <div style={{ opacity:.85, fontWeight:600 }}>
                    ≈ {b.sol.toFixed(4)} SOL ({fmtMoney(b.sol * priceUsdPerSol)})
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      </aside>
    </div>
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      marginTop:10, padding:'12px 14px', borderRadius:14,
      background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.10)'
    }}>
      <div style={{fontSize:11, letterSpacing:1.5, textTransform:'uppercase', opacity:.7}}>{label}</div>
      <div style={{fontSize:28, fontWeight:900}}>{value}</div>
    </div>
  );
}
