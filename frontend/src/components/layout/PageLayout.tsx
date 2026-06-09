import type { ReactNode } from "react";

interface PageLayoutProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  maxWidth?: "md" | "lg" | "xl" | "full";
}

const maxWidthClass = {
  md: "max-w-2xl",
  lg: "max-w-3xl",
  xl: "max-w-4xl",
  full: "max-w-full",
};

export function PageLayout({
  title,
  description,
  actions,
  children,
  maxWidth = "lg",
}: PageLayoutProps) {
  return (
    <div className={`mx-auto w-full px-4 py-6 sm:px-6 ${maxWidthClass[maxWidth]}`}>
      {(title || actions) && (
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title && (
              <h1 className="text-2xl font-semibold text-text tracking-tight">{title}</h1>
            )}
            {description && (
              <p className="mt-1 text-sm text-text-secondary">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </div>
  );
}
