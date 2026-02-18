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
    <div className="login-container">
      {/* Звездное небо */}
      <div className="login-stars"></div>
      
      {/* Туманности */}
      <div className="login-nebula"></div>
      
      {/* Декоративные холмы */}
      <div className="login-hills"></div>

      {/* Форма входа */}
      <form onSubmit={handleSubmit} className="login-form">
        <h1 className="login-title">
          Вход в аккаунт
        </h1>

        <div className="login-field">
          <label>Электронная почта</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="email@example.com"
            required
          />
          {emailError && <div className="login-error">{emailError}</div>}
        </div>

        <div className="login-field">
          <label>Пароль</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
            required
          />
          {passwordError && <div className="login-error">{passwordError}</div>}
        </div>

        <button 
          type="submit" 
          disabled={!canSubmit || loading} 
          className="login-submit-btn"
        >
          {loading ? "Входим..." : "Войти"}
        </button>

        {submitError && <div className="login-submit-error">{submitError}</div>}

        <div className="login-switch">
          Нет аккаунта?
          <Link to="/register" className="login-link">
            Зарегистрироваться
          </Link>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;