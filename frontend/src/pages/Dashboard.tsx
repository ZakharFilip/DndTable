import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../state/session";
import { logout } from "../api/auth";
import { PageLayout } from "../components/layout/PageLayout";
import { Button, Card, Modal } from "../components/ui";

const HUB_ITEMS = [
  { label: "Присоединиться", description: "Найти и войти в сессию", path: "/sessions/join" },
  { label: "Мои сессии", description: "Созданные и доступные столы", path: "/sessions" },
  { label: "Профиль", description: "Аккаунт и друзья", path: "/profile" },
] as const;

export default function Dashboard() {
  const navigate = useNavigate();
  const { clearSession } = useSession();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const confirmLogout = async () => {
    try {
      await logout();
    } catch {
      /* clear locally anyway */
    } finally {
      clearSession();
      setShowLogoutConfirm(false);
      navigate("/login", { replace: true });
    }
  };

  return (
    <PageLayout
      title="Главное меню"
      description="Выберите раздел для продолжения"
      actions={
        <Button variant="ghost" size="sm" onClick={() => setShowLogoutConfirm(true)}>
          Выйти
        </Button>
      }
      maxWidth="md"
    >
      <div className="flex flex-col gap-5">
        {HUB_ITEMS.map((item) => (
          <button
            key={item.path}
            type="button"
            onClick={() => navigate(item.path)}
            className="text-left w-full rounded-[var(--ds-radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-color-focus)]"
          >
            <Card
              hover
              glow
              padding="lg"
              className="min-h-[88px] transition-transform duration-150 hover:-translate-y-0.5"
            >
              <h2 className="text-2xl font-semibold text-text mb-2">{item.label}</h2>
              <p className="text-base text-text-secondary">{item.description}</p>
            </Card>
          </button>
        ))}
      </div>

      <Modal
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="Выйти из аккаунта?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowLogoutConfirm(false)}>
              Отмена
            </Button>
            <Button variant="danger" onClick={() => void confirmLogout()}>
              Выйти
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          Вы будете перенаправлены на страницу входа.
        </p>
      </Modal>
    </PageLayout>
  );
}
