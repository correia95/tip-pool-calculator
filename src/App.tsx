import { useMemo, useState } from 'react';
import { State, Staff, allocateShares, totalWeight, encodeState, decodeState } from './tippool';
import { CURRENCIES, guessCurrency, money } from './intl';

function defaultState(): State {
  return {
    pool: 300,
    people: [
      { name: 'Alex', hours: 5, weight: 1 },
      { name: 'Sam', hours: 3, weight: 1 },
      { name: 'Jordan', hours: 2, weight: 1 },
    ],
    currency: guessCurrency(),
  };
}

function readInitialState(): State {
  const params = new URLSearchParams(window.location.search);
  if ([...params.keys()].length === 0) return defaultState();
  return decodeState(params, defaultState());
}

export default function App() {
  const [state, setState] = useState<State>(readInitialState);
  const [copied, setCopied] = useState(false);

  const shares = useMemo(() => allocateShares(state.pool, state.people), [state.pool, state.people]);
  const total = useMemo(() => totalWeight(state.people), [state.people]);

  function update<K extends keyof State>(key: K, value: State[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function updatePerson(index: number, field: keyof Staff, value: string | number) {
    setState((s) => ({
      ...s,
      people: s.people.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    }));
  }

  function addPerson() {
    setState((s) => ({ ...s, people: [...s.people, { name: `Person ${s.people.length + 1}`, hours: 4, weight: 1 }] }));
  }

  function removePerson(index: number) {
    setState((s) => (s.people.length <= 1 ? s : { ...s, people: s.people.filter((_, i) => i !== index) }));
  }

  async function shareLink() {
    const params = encodeState(state);
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', `?${params.toString()}`);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <main className="page">
      <h1>Tip Pool Calculator</h1>
      <p className="lede">
        Split a pooled tip amount among staff by hours worked, with an optional role weight for
        splitting unevenly between roles.
      </p>

      <section className="panel">
        <h2>Currency</h2>
        <select value={state.currency} onChange={(e) => update('currency', e.target.value)}>
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </section>

      <section className="panel">
        <h2>Tip pool</h2>
        <label className="field">
          <span>Total pool</span>
          <input type="number" step={10} value={state.pool} onChange={(e) => update('pool', e.target.valueAsNumber || 0)} />
        </label>
      </section>

      <section className="panel">
        <h2>Staff</h2>
        {state.people.map((person, i) => (
          <div className="staff-row" key={i}>
            <label className="field">
              <span>Name</span>
              <input type="text" value={person.name} onChange={(e) => updatePerson(i, 'name', e.target.value)} />
            </label>
            <label className="field">
              <span>Hours</span>
              <input type="number" step={0.5} value={person.hours} onChange={(e) => updatePerson(i, 'hours', e.target.valueAsNumber || 0)} />
            </label>
            <label className="field">
              <span>Weight</span>
              <input type="number" step={0.1} value={person.weight} onChange={(e) => updatePerson(i, 'weight', e.target.valueAsNumber || 0)} />
            </label>
            <div className="share-preview">
              <div className="small-label">Share</div>
              <div className="share-amount">{money(shares[i] ?? 0, state.currency)}</div>
            </div>
            <button type="button" className="remove-btn" onClick={() => removePerson(i)} disabled={state.people.length <= 1} aria-label="Remove person">×</button>
          </div>
        ))}
        <button type="button" className="add-btn" onClick={addPerson}>+ Add person</button>
        <p className="hint">Weight defaults to 1 for everyone — raise it for roles that should get a bigger cut per hour (e.g. servers vs. bussers), or leave it as a plain hours-based split.</p>
      </section>

      <section className="result positive">
        <div className="result-row">
          <div><div className="small-label">Total pool</div><div className="big-num">{money(state.pool, state.currency)}</div></div>
          <div><div className="small-label">Total weighted hours</div><div className="big-num">{total.toFixed(1)}</div></div>
        </div>
        <p className="verdict">Shares are split proportionally to each person's hours × weight, and always add up to exactly the pool.</p>
      </section>

      <div className="actions">
        <button className="share-btn" onClick={shareLink}>{copied ? 'Copied!' : 'Copy share link'}</button>
      </div>

      <section className="explainer">
        <h2>How this works</h2>
        <p>
          Each person's share of the pool is proportional to their hours multiplied by their role
          weight, divided by everyone's combined weighted hours. Because splitting money into cents
          rarely divides evenly, the leftover cents are handed out one at a time to whoever's
          fractional share is largest — the standard "largest remainder" method — so the shares
          always add up to exactly the total pool, never a cent more or less.
        </p>
        <h2>Frequently asked questions</h2>
        <h3>What should I set the weight to?</h3>
        <p>Leave it at 1 for a pure hours-based split. Raise it above 1 for roles that customarily get a larger share per hour (like servers over bussers), or below 1 for the reverse — there's no universal standard, so use whatever your workplace agrees on.</p>
        <h3>Why doesn't a simple hours split give clean numbers?</h3>
        <p>Splitting any pool into shares that don't divide evenly leaves fractional cents — this calculator distributes those fairly rather than rounding everyone down (which would lose money) or up (which would exceed the pool).</p>
        <h3>Does this handle tax or reporting requirements?</h3>
        <p>No — this only calculates the split amounts. Tip reporting and withholding rules vary by jurisdiction; check your local requirements separately.</p>
      </section>
    </main>
  );
}
