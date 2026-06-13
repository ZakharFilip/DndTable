import { useState } from "react";
import { Link } from "react-router-dom";
import { register } from "../api/auth";
import { useSession } from "../state/session";
import { AuthLayout } from "../components/layout/AuthLayout";
import { Alert, Button, Checkbox, Input, Label } from "../components/ui";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setUser } = useSession();

  const validateEmail = (v: string) =>
    !/^\S+@\S+\.\S+$/.test(v) ? "Неправильный формат почты" : null;
  const validateUsername = (v: string) => {
    if (v.length < 5) return "Никнейм должен быть не короче 5 символов";
    if (!/^[A-Za-z0-9_]+$/.test(v))
      return "Только буквы, цифры и подчёркивание";
    return null;
  };
  const validatePassword = (v: string) =>
    v.length < 8 ? "Пароль должен содержать не менее 8 символов" : null;
  const validateConfirm = (v: string) =>
    v !== password ? "Пароли не совпадают" : null;
  const validatePrivacy = (accepted: boolean) =>
    accepted ? null : "Необходимо дать согласие на обработку персональных данных";

  const validateAll = () => ({
    email: validateEmail(email),
    username: validateUsername(username),
    password: validatePassword(password),
    confirm: validateConfirm(confirm),
    privacy: validatePrivacy(privacyAccepted),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccess(null);
    const next = validateAll();
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setLoading(true);
    try {
      const resp = await register({ email, password, username });
      if (resp?.success) {
        setUser(resp.data.user);
        setSuccess(
          "Регистрация прошла успешно! На вашу почту отправлено письмо с ссылкой для подтверждения."
        );
      } else {
        setServerError(resp?.message || "Ошибка регистрации");
      }
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { error?: string; message?: string; details?: { field: string; message: string }[] } };
      };
      const data = e.response?.data;
      if (data?.error === "EMAIL_ALREADY_EXISTS") {
        setServerError("Пользователь с такой почтой уже зарегистрирован");
      } else if (data?.error === "USERNAME_ALREADY_EXISTS") {
        setServerError("Этот никнейм уже используется");
      } else if (data?.error === "RESERVED_EMAIL") {
        setServerError("Этот адрес электронной почты зарезервирован");
      } else if (data?.error === "VALIDATION_ERROR" && data.details) {
        const newErrors: Record<string, string | null> = {};
        data.details.forEach((d) => {
          newErrors[d.field] = d.message;
        });
        setErrors((prev) => ({ ...prev, ...newErrors }));
      } else {
        setServerError(data?.message || "Произошла ошибка. Попробуйте позже.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Регистрация"
      subtitle="Создайте аккаунт для игры за столом"
      footer={
        <>
          Уже есть аккаунт?{" "}
          <Link to="/login" className="text-primary hover:text-primary-hover font-medium">
            Войти
          </Link>
        </>
      }
    >
      {success ? (
        <div className="space-y-4">
          <Alert variant="success">{success}</Alert>
          <Button variant="secondary" className="w-full" onClick={() => (window.location.href = "/login")}>
            Перейти ко входу
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="reg-email" required>
              Электронная почта
            </Label>
            <Input
              id="reg-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />
          </div>
          <div>
            <Label htmlFor="reg-username" required>
              Никнейм
            </Label>
            <Input
              id="reg-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={errors.username}
            />
          </div>
          <div>
            <Label htmlFor="reg-password" required>
              Пароль
            </Label>
            <Input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />
            <p className="mt-1 text-xs text-text-muted">
              Сила: {password.length >= 12 ? "сильный" : password.length >= 8 ? "средний" : "слабый"}
            </p>
          </div>
          <div>
            <Label htmlFor="reg-confirm" required>
              Подтверждение пароля
            </Label>
            <Input
              id="reg-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={errors.confirm}
            />
          </div>
          {serverError && <Alert variant="error">{serverError}</Alert>}
          <Checkbox
            id="reg-privacy"
            checked={privacyAccepted}
            onChange={(e) => {
              setPrivacyAccepted(e.target.checked);
              if (e.target.checked) {
                setErrors((prev) => ({ ...prev, privacy: null }));
              }
            }}
            error={errors.privacy}
            label={
              <Link
                to="/privacy"
                className="text-primary hover:text-primary-hover font-medium underline-offset-2 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Согласие на обработку персональных данных
              </Link>
            }
          />
          <Button
            type="submit"
            className="w-full"
            loading={loading}
            disabled={!privacyAccepted}
          >
            Зарегистрироваться
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
