import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card } from "../ui/Card";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="auth-layout min-h-[100dvh] flex items-center justify-center bg-background px-4 py-8 overflow-y-auto">
      <div className="ui-zoom flex flex-col items-center w-full max-w-md">
        <Link
          to="/"
          className="mb-8 text-xl font-semibold text-primary tracking-tight"
        >
          DnD Table
        </Link>
        <Card className="w-full" padding="lg">
          <h1 className="text-2xl font-semibold text-text text-center mb-1">{title}</h1>
          {subtitle && (
            <p className="text-sm text-text-secondary text-center mb-6">{subtitle}</p>
          )}
          {!subtitle && <div className="mb-6" />}
          {children}
        </Card>
        {footer && <div className="mt-6 text-sm text-text-secondary">{footer}</div>}
      </div>
    </div>
  );
}
