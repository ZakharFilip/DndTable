import { Link } from "react-router-dom";
import {
  PRIVACY_POLICY_DISCLAIMER,
  PRIVACY_POLICY_SECTIONS,
  PRIVACY_POLICY_TITLE,
  PRIVACY_POLICY_UPDATED,
} from "../content/privacyPolicy";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-[100dvh] bg-background text-text">
      <div className="ui-zoom mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <Link
          to="/register"
          className="inline-block mb-6 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
        >
          ← К регистрации
        </Link>

        <article className="bg-surface border border-border rounded-[var(--ds-radius-lg)] shadow-card p-6 sm:p-8">
          <header className="mb-8 border-b border-border pb-6">
            <h1 className="font-display text-2xl font-semibold text-text tracking-tight">
              {PRIVACY_POLICY_TITLE}
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              Дата последнего обновления: {PRIVACY_POLICY_UPDATED}
            </p>
          </header>

          <div className="space-y-8">
            {PRIVACY_POLICY_SECTIONS.map((section) => (
              <section key={section.heading}>
                <h2 className="text-base font-semibold text-text mb-3">{section.heading}</h2>
                <div className="space-y-3">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="text-sm text-text-secondary leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <footer className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-text-muted italic leading-relaxed">
              {PRIVACY_POLICY_DISCLAIMER}
            </p>
          </footer>
        </article>
      </div>
    </div>
  );
}
