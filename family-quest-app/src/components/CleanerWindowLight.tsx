import {
  CLEANER_WINDOW_PROJECTIONS,
  type CleanerLightPoint,
  type CleanerRoomDef,
  type CleanerTimeOfDay,
  type CleanerWindowProjection,
} from "../lib/cleaner";

// Colored light "panes" projected onto the floor through a room's window,
// ported 1:1 (same math, same per-room/per-time corner coordinates) from a
// third-party prototype's own WindowLightCast component -- safe to port
// exactly this time because the prototype's own background art is
// byte-identical to what this app actually ships (verified before writing
// CLEANER_WINDOW_PROJECTIONS in lib/cleaner.ts), unlike an earlier pass at
// this feature which had to be skipped for not knowing that.
//
// The 4 corners of a room's window (in the SAME 0-100 scene-percent
// coordinate space as everything else in .cleaner-scene) are projected into
// either 4 grid panes (a plain window) or 2 tall panes (a window split by a
// visible center mullion, "split-vertical") via bilinear interpolation --
// mixPoint/projectPoint below -- so each pane's own shape follows the
// window's real on-screen perspective instead of being a plain rectangle.

function mixPoint(a: CleanerLightPoint, b: CleanerLightPoint, ratio: number): CleanerLightPoint {
  return { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
}

function projectPoint(
  corners: CleanerWindowProjection["corners"],
  xRatio: number,
  yRatio: number,
): CleanerLightPoint {
  const [topLeft, topRight, bottomRight, bottomLeft] = corners;
  const top = mixPoint(topLeft, topRight, xRatio);
  const bottom = mixPoint(bottomLeft, bottomRight, xRatio);
  return mixPoint(top, bottom, yRatio);
}

function projectedPane(
  corners: CleanerWindowProjection["corners"],
  xStart: number,
  xEnd: number,
  yStart: number,
  yEnd: number,
): string {
  return [
    projectPoint(corners, xStart, yStart),
    projectPoint(corners, xEnd, yStart),
    projectPoint(corners, xEnd, yEnd),
    projectPoint(corners, xStart, yEnd),
  ]
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
}

export function CleanerWindowLight({
  roomId,
  timeOfDay,
}: {
  roomId: CleanerRoomDef["id"];
  timeOfDay: CleanerTimeOfDay;
}) {
  if (timeOfDay === "night") return null;
  const projection = CLEANER_WINDOW_PROJECTIONS[roomId]?.[timeOfDay];
  if (!projection) return null;
  const corners = projection.corners;
  const panes =
    projection.layout === "split-vertical"
      ? [projectedPane(corners, 0, 0.44, 0, 1), projectedPane(corners, 0.56, 1, 0, 1)]
      : [
          projectedPane(corners, 0, 0.44, 0, 0.43),
          projectedPane(corners, 0.56, 1, 0, 0.43),
          projectedPane(corners, 0, 0.44, 0.57, 1),
          projectedPane(corners, 0.56, 1, 0.57, 1),
        ];
  return (
    <svg
      className={`cleaner-window-light is-time-${timeOfDay}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {panes.map((points, index) => (
        <polygon className="cleaner-window-light-pane" points={points} key={index} />
      ))}
    </svg>
  );
}
