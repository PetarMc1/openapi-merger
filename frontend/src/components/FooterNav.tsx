import type { AppRoute } from '../types/app';

type FooterNavProps = {
  onNavigate: (route: AppRoute) => void;
};

export function FooterNav({ onNavigate }: FooterNavProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="app-footer_links">
        <a
          href="/"
          onClick={(event) => {
            event.preventDefault();
            onNavigate('/');
          }}
        >
          Home
        </a>
        <span aria-hidden="true">•</span>
        <a
          href="/faq"
          onClick={(event) => {
            event.preventDefault();
            onNavigate('/faq');
          }}
        >
          FAQ
        </a>
        <span aria-hidden="true">•</span>
        <a
          href="/terms"
          onClick={(event) => {
            event.preventDefault();
            onNavigate('/terms');
          }}
        >
          Terms
        </a>
      </div>
      <p className="app-footer_legal">Copyright © {year} {" "}
        <a href="https://github.com/PetarMc1"
          target="_blank"
          rel="noopener noreferrer"
        >
          PetarMc1
        </a>
        . Licensed under Apache License 2.0.
      </p>
    </footer>
  );
}
