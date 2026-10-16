import './Tabs.css';

/**
 * Standard top-level page tabs.
 *
 *   <Tabs items={[{ id, label, badge? }]} active={id} onChange={id => …} fit />
 *
 * Sizes come from --fs-tab (styles/tokens/typography.css), so tab labels match
 * across pages and shrink per device.
 *
 * Phone overflow, two modes:
 *   default — the strip scrolls sideways (right for 5+ tabs).
 *   fit     — every tab shares the width equally and long labels wrap, so up
 *             to ~4 tabs are all visible without scrolling.
 *
 * Pages that can't use the component yet can use the same classes directly
 * (.ui-tabs / .ui-tab / .ui-tab--active).
 */
export default function Tabs({ items, active, onChange, fit = false, className = '' }) {
  return (
    <div className={`ui-tabs${fit ? ' ui-tabs--fit' : ''} ${className}`.trim()} role="tablist">
      {items.map(t => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          className={`ui-tab${active === t.id ? ' ui-tab--active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.badge ? <span className="ui-tab__badge">{t.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}
