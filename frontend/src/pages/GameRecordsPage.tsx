import { PageLayout } from "../components/layout/PageLayout";
import { Card, EmptyState } from "../components/ui";

export default function GameRecordsPage() {
  return (
    <PageLayout title="Записи игр" description="Архив сессий, логов и отчётов">
      <Card>
        <EmptyState
          title="Пока нет записей"
          description="Здесь позже появится список сохранённых сессий, логов и отчётов о играх."
        />
      </Card>
    </PageLayout>
  );
}
