import { PageLayout } from "../components/layout/PageLayout";
import { Card, EmptyState } from "../components/ui";

export default function Party() {
  return (
    <PageLayout title="Party" description="Редактор сцен и объектов">
      <Card>
        <EmptyState
          title="В разработке"
          description="Редактор сцен на PixiJS появится в следующих версиях."
        />
      </Card>
    </PageLayout>
  );
}
