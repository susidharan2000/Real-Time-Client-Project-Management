import type { Request, Response } from "express";
import { fetchMyActivityFeed, markActivityFeedSeen } from "./activity.service";

function validId(id: unknown): id is string {
  return typeof id === "string" && /^[1-9]\d{0,18}$/.test(id) && BigInt(id) <= 9223372036854775807n;
}

export async function getMyActivityFeed(req: Request, res: Response) {
  const cursor = req.query.after_activity_id;
  if (cursor !== undefined && !validId(cursor)) return res.status(400).json({ message: "Invalid activity cursor" });
  if (req.query.missed !== undefined && (typeof req.query.missed !== "string" || !["true", "false"].includes(req.query.missed))) {
    return res.status(400).json({ message: "Invalid missed activity filter" });
  }
  try {
    const activities = await fetchMyActivityFeed(res.locals.userId, cursor ?? null, req.query.missed === "true");
    return res.status(200).json({ activities });
  } catch (error) {
    console.error("Failed to fetch activity feed:", error);
    return res.status(500).json({ message: "Could not fetch activity feed" });
  }
}

export async function markFeedSeen(req: Request, res: Response) {
  const { activityIds } = req.body ?? {};
  if (!Array.isArray(activityIds) || activityIds.length === 0 || activityIds.length > 40 || !activityIds.every(validId)) {
    return res.status(400).json({ message: "Provide 1 to 40 valid activity IDs" });
  }
  try {
    await markActivityFeedSeen(res.locals.userId, activityIds);
    return res.status(200).json({ message: "Activity feed marked as seen" });
  } catch (error) {
    console.error("Failed to mark activity feed as seen:", error);
    return res.status(500).json({ message: "Could not mark activity feed as seen" });
  }
}
