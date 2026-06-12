import { useState } from "react";
import "../styles/design-system/index.css";

export default function DesignSystemPreview() {
  const [modalOpen, setModalOpen] = useState(false);

  const swatches = [
    { name: "base", var: "--ds-color-base" },
    { name: "base-subtle", var: "--ds-color-base-subtle" },
    { name: "surface", var: "--ds-color-surface" },
    { name: "surface-raised", var: "--ds-color-surface-raised" },
    { name: "structure", var: "--ds-color-structure" },
    { name: "structure-muted", var: "--ds-color-structure-muted" },
    { name: "accent", var: "--ds-color-accent" },
    { name: "accent-muted", var: "--ds-color-accent-muted" },
    { name: "focus", var: "--ds-color-focus" },
    { name: "success", var: "--ds-color-success" },
    { name: "warning", var: "--ds-color-warning" },
    { name: "error", var: "--ds-color-error" },
  ];

  return (
    <div className="ds-theme ds-grain min-h-screen">
      <header className="ds-chrome sticky top-0 z-40">
        <span className="ds-text-label">Calm Sci-Fi</span>
        <span className="ds-text-title" style={{ marginLeft: 12 }}>
          Design System Preview
        </span>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 64px" }}>
        <section style={{ marginBottom: 48 }}>
          <p className="ds-text-label" style={{ marginBottom: 8 }}>
            Typography
          </p>
          <h1 className="ds-text-display" style={{ marginBottom: 8 }}>
            Virtual Tabletop
          </h1>
          <p className="ds-text-title" style={{ marginBottom: 8 }}>
            Mission archive interface
          </p>
          <p className="ds-text-body" style={{ marginBottom: 4 }}>
            Body text — спокойная рабочая среда для любого жанра кампании.
          </p>
          <p className="ds-text-body-sm">Secondary small — метаданные сессии</p>
          <p className="ds-text-caption" style={{ marginTop: 8 }}>
            Caption — статус синхронизации
          </p>
          <p className="ds-font-mono ds-text-body-sm" style={{ marginTop: 8 }}>
            session:a7f3c2 · IBM Plex Mono
          </p>
        </section>

        <section style={{ marginBottom: 48 }}>
          <p className="ds-text-label" style={{ marginBottom: 12 }}>
            Palette 60 / 30 / 10
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 12,
            }}
          >
            {swatches.map((s) => (
              <div key={s.name}>
                <div className="ds-swatch" style={{ background: `var(${s.var})` }} />
                <p className="ds-text-caption" style={{ marginTop: 4 }}>
                  {s.name}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 48 }}>
          <p className="ds-text-label" style={{ marginBottom: 12 }}>
            Buttons
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <button type="button" className="ds-btn ds-btn--md ds-btn--primary">
              Primary
            </button>
            <button type="button" className="ds-btn ds-btn--md ds-btn--secondary">
              Secondary
            </button>
            <button type="button" className="ds-btn ds-btn--md ds-btn--ghost">
              Ghost
            </button>
            <button type="button" className="ds-btn ds-btn--md ds-btn--danger">
              Danger
            </button>
            <button type="button" className="ds-btn ds-btn--sm ds-btn--primary" disabled>
              Disabled
            </button>
          </div>
        </section>

        <section style={{ marginBottom: 48 }}>
          <p className="ds-text-label" style={{ marginBottom: 12 }}>
            Cards
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="ds-card" style={{ padding: 20 }}>
              <p className="ds-text-title" style={{ marginBottom: 8 }}>
                Static card
              </p>
              <p className="ds-text-body-sm">Surface, structure border, card shadow.</p>
            </div>
            <div className="ds-card ds-card--hover ds-card--interactive" style={{ padding: 20 }}>
              <p className="ds-text-title" style={{ marginBottom: 8 }}>
                Interactive card
              </p>
              <p className="ds-text-body-sm">Riso accent strip, hover elevation.</p>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: 48 }}>
          <p className="ds-text-label" style={{ marginBottom: 12 }}>
            Toolbar
          </p>
          <div className="ds-toolbar">
            <button type="button" className="ds-tool-btn ds-tool-btn--active" title="Select">
              ◇
            </button>
            <button type="button" className="ds-tool-btn" title="Shape">
              ▢
            </button>
            <button type="button" className="ds-tool-btn" title="Text">
              T
            </button>
          </div>
        </section>

        <section style={{ marginBottom: 48 }}>
          <p className="ds-text-label" style={{ marginBottom: 12 }}>
            Context menu
          </p>
          <div className="ds-menu" style={{ display: "inline-block" }}>
            <button type="button" className="ds-menu-item">
              Копировать
            </button>
            <button type="button" className="ds-menu-item">
              Вставить
            </button>
            <hr className="ds-menu-separator" />
            <button type="button" className="ds-menu-item ds-menu-item--danger">
              Удалить
            </button>
          </div>
        </section>

        <section style={{ marginBottom: 48 }}>
          <p className="ds-text-label" style={{ marginBottom: 12 }}>
            Sidebar
          </p>
          <div className="ds-sidebar" style={{ maxHeight: 200 }}>
            <div className="ds-sidebar-header">
              <p className="ds-text-label">Properties</p>
              <p className="ds-text-title">Object</p>
            </div>
            <div style={{ padding: 16 }}>
              <p className="ds-text-body-sm">Panel chrome with structure edge.</p>
            </div>
          </div>
        </section>

        <section>
          <p className="ds-text-label" style={{ marginBottom: 12 }}>
            Modal
          </p>
          <button
            type="button"
            className="ds-btn ds-btn--md ds-btn--primary"
            onClick={() => setModalOpen(true)}
          >
            Open modal
          </button>
        </section>
      </main>

      {modalOpen && (
        <div
          className="ds-modal-overlay ds-fade-in"
          role="presentation"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="ds-modal-content ds-scale-in"
            role="dialog"
            aria-modal
            aria-labelledby="ds-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--ds-color-structure-muted)",
              }}
            >
              <p className="ds-text-label">Confirm</p>
              <h2 id="ds-modal-title" className="ds-text-title">
                Удалить объект?
              </h2>
            </header>
            <div style={{ padding: 16 }}>
              <p className="ds-text-body-sm">Fog overlay, surface-raised, scale-in motion.</p>
            </div>
            <footer
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                padding: "12px 16px",
                borderTop: "1px solid var(--ds-color-structure-muted)",
              }}
            >
              <button
                type="button"
                className="ds-btn ds-btn--md ds-btn--secondary"
                onClick={() => setModalOpen(false)}
              >
                Отмена
              </button>
              <button type="button" className="ds-btn ds-btn--md ds-btn--danger">
                Удалить
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
