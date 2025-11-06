// helper: roll a timestamp forward by k intervals until it's in the future
function rollForward(next: number, intervalMs: number, nowTs: number, buffer = 15000) {
  if (!Number.isFinite(next) || !Number.isFinite(intervalMs) || intervalMs <= 0) return null;
  // add a tiny buffer so we don't flicker at near-zero
  const base = next + buffer;
  if (nowTs <= base) return next;
  const k = Math.ceil((nowTs - base) / intervalMs);
  return next + k * intervalMs;
}

React.useEffect(() => {
  if (typeof window === 'undefined') return;
  let alive = true;

  const load = () =>
    fetch(`/data/state.json?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: StateJson) => {
        if (!alive) return;

        const s = d?.schedule ?? {};
        // allow minutes or ms
        const burnIntervalMs =
          typeof s.burnIntervalMs === 'number'
            ? s.burnIntervalMs
            : typeof s.burnIntervalMinutes === 'number'
            ? s.burnIntervalMinutes * 60_000
            : undefined;

        const nowTs = Date.now();

        // manual override via query (?at=ISO_OR_MS)
        const atParam = params?.get('at');
        if (atParam) {
          const manual =
            /^\d+$/.test(atParam) ? Number(atParam) : Date.parse(atParam);
          if (Number.isFinite(manual)) {
            setTarget(manual);
            return;
          }
        }

        let next: number | null =
          typeof s.nextBurnAt === 'number' ? s.nextBurnAt : null;

        // if missing, try lastBurnAt + interval
        if (next == null && typeof s.lastBurnAt === 'number' && burnIntervalMs) {
          next = s.lastBurnAt + burnIntervalMs;
        }

        // if still missing but we know the interval, seed from now
        if (next == null && burnIntervalMs) {
          next = nowTs + burnIntervalMs;
        }

        // roll forward if the saved nextBurnAt is already in the past
        if (next != null && burnIntervalMs) {
          const rolled = rollForward(next, burnIntervalMs, nowTs);
          setTarget(rolled ?? next);
        } else {
          setTarget(next ?? null);
        }
      })
      .catch(() => {
        // keep whatever target we had; silent fail
      });

  load();
  const id = setInterval(load, 15_000); // refresh schedule every 15s
  return () => {
    alive = false;
    clearInterval(id);
  };
}, [/* no deps */]);
