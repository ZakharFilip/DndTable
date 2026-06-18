import type { TableObjectState } from "../model";
import { objectFromDto } from "../model";

/**
 * Normalizes DTO ↔ domain object position when x/y columns and props.transform diverge.
 */
export class TableObjectHydrator {
  static mergePositionIntoProps(
    props: Record<string, unknown>,
    x: number,
    y: number
  ): Record<string, unknown> {
    const cloned = JSON.parse(JSON.stringify(props)) as Record<string, unknown>;
    const transform = cloned.transform;
    if (transform && typeof transform === "object") {
      const t = transform as { position?: { x?: number; y?: number } };
      t.position = { ...(t.position ?? {}), x, y };
      return cloned;
    }
    return cloned;
  }

  static fromDto(dto: {
    id: string;
    key?: string;
    version?: number;
    type: string;
    x: number;
    y: number;
    sortOrder?: number;
    props?: Record<string, unknown>;
  }): TableObjectState | null {
    const props = dto.props ?? {};
    const hasTabletopTransform =
      props &&
      typeof props === "object" &&
      "transform" in props &&
      "type" in props;

    const reconciledProps = hasTabletopTransform
      ? TableObjectHydrator.mergePositionIntoProps(props, dto.x, dto.y)
      : props;

    return objectFromDto({
      ...dto,
      props: reconciledProps,
    });
  }
}
