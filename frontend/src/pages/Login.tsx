import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { useSession } from "../state/session";
import { AuthLayout } from "../components/layout/AuthLayout";
import { Alert, Button, Input, Label } from "../components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { setUser } = useSession();

  const validate = () => {
    let ok = true;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setEmailError("Введите корректный адрес электронной почты");
      ok = false;
    } else setEmailError(null);
    if (!password || password.length < 8) {
      setPasswordError("Пароль должен содержать не менее 8 символов");
      ok = false;
    } else setPasswordError(null);
    return ok;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitError(null);
    setLoading(true);

    try {
      const resp = await login({ email, password });
      if (resp?.success) {
        setUser(resp.data.user);
        navigate("/dashboard", { replace: true });
      } else {
        setSubmitError("Неверный email или пароль");
      }
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      if (e.response?.status === 401) {
        setSubmitError("Неверный email или пароль");
      } else if (e.response?.data?.message) {
        setSubmitError(e.response.data.message);
      } else {
        setSubmitError("Произошла ошибка. Попробуйте позже.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Вход в аккаунт"
      subtitle="Войдите, чтобы продолжить"
      footer={
        <>
          Нет аккаунта?{" "}
          <Link to="/register" className="text-primary hover:text-primary-hover font-medium">
            Зарегистрироваться
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email" required>
            Электронная почта
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            error={emailError}
            autoComplete="email"
          />
        </div>
        <div>
          <Label htmlFor="password" required>
            Пароль
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            error={passwordError}
            autoComplete="current-password"
          />
        </div>
        {submitError && <Alert variant="error">{submitError}</Alert>}
        <Button type="submit" className="w-full" loading={loading} disabled={loading}>
          Войти
        </Button>
      </form>
    </AuthLayout>
  );
}
