import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSession } from "../api/sessions";
import { PageLayout } from "../components/layout/PageLayout";
import { Alert, Button, Card, Input, Label, Textarea } from "../components/ui";
import {
  SESSION_DESCRIPTION_MAX,
  validateSessionDescription,
  validateSessionName,
} from "../utils/sessionFormValidation";

export default function CreateSessionPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const nextNameError = validateSessionName(trimmedName);
    const nextDescriptionError = validateSessionDescription(trimmedDescription);
    setNameError(nextNameError);
    setDescriptionError(nextDescriptionError);
    if (nextNameError || nextDescriptionError) return;

    setLoading(true);
    try {
      await createSession({
        name: trimmedName,
        description: trimmedDescription,
        isPrivate,
      });
      navigate("/sessions");
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string; details?: { field: string; message: string }[] } };
      };
      const details = axiosErr.response?.data?.details;
      if (details?.length) {
        details.forEach((d) => {
          if (d.field === "name") setNameError(d.message);
          if (d.field === "description") setDescriptionError(d.message);
        });
      }
      const msg = axiosErr.response?.data?.message ?? "Не удалось создать сессию";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout title="Создать сессию" description="Настройте новый игровой стол" maxWidth="md">
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <div>
            <Label htmlFor="session-name" required>
              Название
            </Label>
            <Input
              id="session-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название сессии"
              error={nameError}
              maxLength={100}
            />
          </div>
          <div>
            <Label htmlFor="session-description">Описание</Label>
            <Textarea
              id="session-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание сессии"
              rows={4}
              maxLength={SESSION_DESCRIPTION_MAX}
              error={descriptionError}
            />
            <p className="mt-1 text-xs text-text-muted text-right">
              {description.length}/{SESSION_DESCRIPTION_MAX}
            </p>
          </div>
          <label className="flex items-start gap-2 text-sm text-text-secondary cursor-pointer">
            <input
              id="session-private"
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="mt-1 rounded border-border text-primary focus:ring-primary"
            />
            <span>Приватная сессия (не показывать в списке для присоединения)</span>
          </label>
          <Button type="submit" loading={loading}>
            Создать
          </Button>
        </form>
      </Card>
    </PageLayout>
  );
}
