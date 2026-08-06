/**
 * Maps raw database business status to user-facing labels.
 */
export function getBusinessStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: "Active",
    trialing: "Trialing",
    past_due: "Past Due",
    suspended: "Suspended",
    cancelled: "Cancelled",
    archived: "Archived",
  };
  return labels[status] ?? status;
}

/**
 * Maps raw database subscription status to user-facing labels.
 */
export function getSubscriptionStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    trialing: "Trialing",
    active: "Active",
    past_due: "Past Due",
    cancelled: "Cancelled",
    expired: "Expired",
    suspended: "Suspended",
    incomplete: "Incomplete",
  };
  return labels[status] ?? status;
}

/**
 * Maps subscription status to a MUI color for Chip.
 */
export function getSubscriptionStatusColor(
  status: string
): "success" | "warning" | "error" | "info" | "default" {
  switch (status) {
    case "active":
      return "success";
    case "trialing":
      return "info";
    case "past_due":
      return "warning";
    case "cancelled":
    case "expired":
    case "suspended":
      return "error";
    default:
      return "default";
  }
}

/**
 * Maps business status to a MUI color for Chip.
 */
export function getBusinessStatusColor(
  status: string
): "success" | "warning" | "error" | "info" | "default" {
  switch (status) {
    case "active":
      return "success";
    case "trialing":
      return "info";
    case "past_due":
      return "warning";
    case "suspended":
    case "cancelled":
    case "archived":
      return "error";
    default:
      return "default";
  }
}

/**
 * Maps tenant member role to a user-facing label.
 */
export function getMemberRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    owner: "Owner",
    admin: "Admin",
    manager: "Manager",
    staff: "Staff",
  };
  return labels[role] ?? role;
}
