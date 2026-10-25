// Rotation that centres [lon, lat] on the globe, turning the short way round
// from `start` so the longitude never moves more than 180°.
export const getCentringRotation = (start, [lon, lat]) => {
  const dLon = ((((-lon - start[0]) % 360) + 540) % 360) - 180;
  return [start[0] + dLon, -lat, start[2] || 0];
};
