import type { AppRoute } from '../types/app';

type HeaderNavProps = {
  route: AppRoute;
  onNavigate: (route: AppRoute) => void;
};

export function HeaderNav({ route, onNavigate }: HeaderNavProps) {
  return (
    <nav className="top-nav" aria-label="Primary navigation">
      <a
        className={`top-nav_link ${route === '/' ? 'top-nav_link-active' : ''}`}
        href="/"
        onClick={(event) => {
          event.preventDefault();
          onNavigate('/');
        }}
      >
        Home
      </a>
      <a
        className={`top-nav_link ${route === '/faq' ? 'top-nav_link-active' : ''}`}
        href="/faq"
        onClick={(event) => {
          event.preventDefault();
          onNavigate('/faq');
        }}
      >
        FAQ
      </a>
      <a
        className={`top-nav_link ${route === '/terms' ? 'top-nav_link-active' : ''}`}
        href="/terms"
        onClick={(event) => {
          event.preventDefault();
          onNavigate('/terms');
        }}
      >
        Terms
      </a>
    </nav>
  );
}
