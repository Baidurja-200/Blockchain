import ActivityLog from "../models/ActivityLog.js";

export async function logActivity({ type, message, actor = "System", referenceId = "", severity = "info" }) {
  return ActivityLog.create({ type, message, actor, referenceId, severity });
}

export default { logActivity };
