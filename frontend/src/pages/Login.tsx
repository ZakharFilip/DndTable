// frontend/src/pages/Login.tsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { useSession } from "../state/session";
import "../styles/Login.css";
export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { setUser } = useSession();

  useEffect(() => {
    if (!email) {
      setEmailError("Введите корректный адрес электронной почты");
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      setEmailError("Введите корректный адрес электронной почты");
    } else {
      setEmailError(null);
    }

    if (!password) {
      setPasswordError("Пароль должен содержать не менее 8 символов");
    } else if (password.length < 8) {
      setPasswordError("Пароль должен содержать не менее 8 символов");
    } else {
      setPasswordError(null);
    }
  }, [email, password]);

  const canSubmit = !emailError && !passwordError && email && password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitError(null);
    setLoading(true);

    try {
      const resp = await login({ email, password });

      if (resp?.success) {
        const { user } = resp.data;
        setUser(user);
        navigate("/dashboard", { replace: true });
      } else {
        setSubmitError("Неверный email или пароль");
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setSubmitError("Неверный email или пароль");
      } else if (err.response?.data?.message) {
        setSubmitError(err.response.data.message);
      } else {
        setSubmitError("Произошла ошибка. Попробуйте позже.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Вход в аккаунт</h2>

        <div className="field">
          <label>Электронная почта</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
          {emailError && <div className="error">{emailError}</div>}
        </div>

        <div className="field">
          <label>Пароль</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
          {passwordError && <div className="error">{passwordError}</div>}
        </div>

        <button type="submit" disabled={!canSubmit || loading} className="submit-btn">
          {loading ? "Входим..." : "Войти"}
        </button>

        {submitError && <div className="error submit-error">{submitError}</div>}

        {/* ←←←←←←←←←←←←← НОВАЯ КНОПКА / ССЫЛКА ←←←←←←←←←←←←← */}
        <div className="auth-switch">
          Нет аккаунта?{" "}
          <Link to="/register" className="link">
            Зарегистрироваться
          </Link>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;