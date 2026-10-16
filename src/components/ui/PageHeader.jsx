import './PageHeader.css';

/**
 * The standard page heading: title (+ optional pill/badge beside it), subtitle,
 * and an actions area.
 *
 * Owns LAYOUT and TYPE SIZE only — sizes come from the role tokens in
 * styles/tokens/typography.css, so every page's title is the same size on the
 * same device. Colour/gradient stays with the page: pass `titleClassName` to
 * keep a page's own title treatment (it must not set font-size).
 *
 * Responsive behaviour, handled here so pages don't each reinvent it:
 *   - ≤768px the actions drop below the title as a full-width wrapping row
 *     (side-by-side squeezed the title into a ~120px column on phones).
 *   - When the floating ☰ button is on screen, the title row is indented past
 *     it instead of rendering underneath it.
 */
export default function PageHeader({
  title,
  subtitle,
  titleExtra,
  actions,
  titleClassName = '',
  className = '',
}) {
  return (
    <header className={`page-header ${className}`.trim()}>
      <div className="page-header__main">
        <div className="page-header__titlerow">
          <h1 className={`page-header__title ${titleClassName}`.trim()}>{title}</h1>
          {titleExtra}
        </div>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}
