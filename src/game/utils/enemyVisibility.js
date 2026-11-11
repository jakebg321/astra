

export function isEnemyVisible(player) {
  if (!player) return false;
  if (player.isDashing) return false;
  if (player.isPortalTraveling) return false;
  if (player.inHyperspace) return false;
  return true;
}
