import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/Button";

interface Props {
  children: ReactNode;
  title?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full space-y-4 text-center">
            <h1 className="text-lg font-semibold text-text">
              {this.props.title ?? "Ошибка отображения"}
            </h1>
            <p className="text-sm text-text-secondary">
              Что-то пошло не так. Попробуйте перезагрузить страницу или вернуться к списку сессий.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button type="button" onClick={() => window.location.reload()}>
                Перезагрузить
              </Button>
              <Link to="/sessions">
                <Button type="button" variant="secondary">
                  К списку сессий
                </Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
