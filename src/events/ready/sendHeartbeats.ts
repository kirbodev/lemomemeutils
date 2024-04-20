import getErrorStatus, { dbStatus } from "../../handlers/errorHandler";
import logger from "../../helpers/logger";

export default () => {
    if (process.env.NODE_ENV) return;
    logger.info("Sending heartbeats");
    sendHeartbeats();
    setInterval(sendHeartbeats, 1000 * 60 * 5).unref();
};

async function sendHeartbeats() {
  await fetch(process.env.HEARTBEAT_URL!)
    .then((res) => {
      if (!res.ok)
        logger.warn(
          `Failed to send heartbeat - ${res.status} ${res.statusText}`
        );
    })
    .catch(() => logger.warn("Failed to send heartbeat"));

  if (!dbStatus) {
    await fetch(process.env.DB_HEARTBEAT_URL!)
      .then((res) => {
        if (!res.ok)
          logger.warn(
            `Failed to send db heartbeat - ${res.status} ${res.statusText}`
          );
      })
      .catch(() => logger.warn("Failed to send db heartbeat"));
  }

  const status = getErrorStatus();
  if (!status) {
    await fetch(process.env.PERFECT_HEARTBEAT_URL!)
      .then((res) => {
        if (!res.ok)
          logger.warn(
            `Failed to send perfect heartbeat - ${res.status} ${res.statusText}`
          );
      })
      .catch(() => logger.warn("Failed to send perfect heartbeat"));
  }
}
