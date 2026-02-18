import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../state/session";
import { logout } from "../api/auth";
import "../styles/Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const { clearSession } = useSession();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    try {
      await logout();
    } catch {
      // If request fails, still clear local state. Cookie will expire naturally or be cleared on next server call.
    } finally {
      clearSession();
      setShowLogoutConfirm(false);
      navigate("/login", { replace: true });
    }
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <div className="dashboard-container">
      {/* Звездное небо */}
      <div className="dashboard-stars"></div>
      
      {/* Туманности */}
      <div className="dashboard-nebula"></div>
      
      {/* Декоративные холмы */}
      <div className="dashboard-hills"></div>

      {/* Основной контент */}
      <div className="dashboard-content">
        <div className="dashboard-menu">
          <h1 className="dashboard-title">
            Главное меню
          </h1>

          <div className="dashboard-buttons">
            <button
              type="button"
              onClick={() => navigate("/sessions/join")}
              className="dashboard-btn"
            >
              Присоединиться
            </button>

            <button
              type="button"
              onClick={() => navigate("/sessions/create")}
              className="dashboard-btn"
            >
              Создать сессию
            </button>

            <button
              type="button"
              onClick={() => navigate("/records")}
              className="dashboard-btn"
            >
              Записи игр
            </button>

            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="dashboard-btn"
            >
              Профиль
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="dashboard-btn logout"
            >
              Выйти
            </button>
          </div>
        </div>
      </div>

      {/* Модальное окно подтверждения выхода */}
      {showLogoutConfirm && (
        <div className="dashboard-modal">
          <div className="modal-content">
            <h2 className="modal-title">
              Выйти из аккаунта?
            </h2>
            <p className="modal-text">
              Вы уверены, что хотите выйти из аккаунта? Вас перенесёт на
              страницу авторизации.
            </p>

            <div className="modal-buttons">
              <button
                type="button"
                onClick={cancelLogout}
                className="modal-btn cancel"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="modal-btn confirm"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}