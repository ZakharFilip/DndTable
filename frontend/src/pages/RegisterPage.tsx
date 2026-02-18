import React, { useState } from "react";
import { register } from "../api/auth";
import { useSession } from "../state/session";

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { setUser } = useSession();

  const validateEmail = (value: string) => {
    if (!/^\S+@\S+\.\S+$/.test(value)) return "Неправильный формат почты";
    return null;
  };

  const validateUsername = (value: string) => {
    if (value.length < 5) return "Никнейм должен быть не короче 5 символов";
    if (!/^[A-Za-z0-9_]+$/.test(value)) return "Никнейм должен содержать только буквы, цифры и подчеркивание";
    return null;
  };

  const validatePassword = (value: string) => {
    if (value.length < 8) return "Пароль должен содержать не менее 8 символов";
    return null;
  };

  const validateConfirm = (value: string) => {
    if (value !== password) return "Пароли не совпадают";
    return null;
  };

  const onBlur = (field: string) => {
    let err: string | null = null;
    if (field === "email") err = validateEmail(email);
    if (field === "username") err = validateUsername(username);
    if (field === "password") err = validatePassword(password);
    if (field === "confirm") err = validateConfirm(confirm);

    setErrors(prev => ({ ...prev, [field]: err }));
  };

  const canSubmit = !validateEmail(email) && !validatePassword(password) && !validateUsername(username) && !validateConfirm(confirm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccess(null);
    if (!canSubmit) {
      setErrors({
        email: validateEmail(email),
        username: validateUsername(username),
        password: validatePassword(password),
        confirm: validateConfirm(confirm)
      });
      return;
    }

    setLoading(true);
    try {
      const resp = await register({ email, password, username });
      if (resp && resp.success) {
        const { user } = resp.data;
        setUser(user);
        setSuccess("Регистрация прошла успешно! На вашу почту отправлено письмо с ссылкой для подтверждения.");
      } else {
        setServerError(resp?.message || "Ошибка регистрации");
      }
    } catch (err: any) {
      if (err.response) {
        const data = err.response.data;
        if (data && data.error === "EMAIL_ALREADY_EXISTS") {
          setServerError("Пользователь с такой почтой уже зарегистрирован");
        } else if (data && data.error === "USERNAME_ALREADY_EXISTS") {
          setServerError("Этот никнейм уже используется");
        } else if (data && data.error === "VALIDATION_ERROR" && data.details) {
          // Map server validation details to fields
          const newErrors: Record<string, string | null> = {};
          data.details.forEach((d: any) => { newErrors[d.field] = d.message; });
          setErrors(prev => ({ ...prev, ...newErrors }));
        } else {
          setServerError(data.message || "Произошла ошибка");
        }
      } else {
        setServerError("Произошла ошибка. Попробуйте позже.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Регистрация</h2>

      <div>
        <label>Электронная почта</label>
        <input value={email} onChange={e => setEmail(e.target.value)} onBlur={() => onBlur("email")} />
        {errors.email && <div role="alert">{errors.email}</div>}
      </div>

      <div>
        <label>Никнейм</label>
        <input value={username} onChange={e => setUsername(e.target.value)} onBlur={() => onBlur("username")} />
        {errors.username && <div role="alert">{errors.username}</div>}
      </div>

      <div>
        <label>Пароль</label>
        <input value={password} type="password" onChange={e => setPassword(e.target.value)} onBlur={() => onBlur("password")} />
        {errors.password && <div role="alert">{errors.password}</div>}
        {/* Индикатор сложности (простая реализация) */}
        <div>Сила пароля: {password.length >= 12 ? "Сильный" : password.length >= 8 ? "Средний" : "Слабый"}</div>
      </div>

      <div>
        <label>Подтверждение пароля</label>
        <input value={confirm} type="password" onChange={e => setConfirm(e.target.value)} onBlur={() => onBlur("confirm")} />
        {errors.confirm && <div role="alert">{errors.confirm}</div>}
      </div>

      <div>
        <button type="submit" disabled={!canSubmit || loading}>
          {loading ? "..." : "Зарегистрироваться"}
        </button>
      </div>

      {serverError && <div role="alert">{serverError}</div>}
      {success && (
        <div>
          <div>{success}</div>
          <button type="button" onClick={() => (window.location.href = "/login")}>Вернуться на страницу входа</button>
        </div>
      )}
    </form>
  );
};
export default RegisterPage;