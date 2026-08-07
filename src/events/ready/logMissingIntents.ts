import logger from "../../helpers/logger.js";
import {
  hasGuildMembers,
  hasMessageContent,
} from "../../utils/capabilities.js";

export default async () => {
  if (!hasGuildMembers()) {
    logger.warn(
      "Guild Members privilege is disabled. These features will not run:\n" +
        "- /randomban (needs the full member list)\n" +
        "- Member join events (persist warns / pardons / thin-ice clearing)\n" +
        "- Name-based member search (`,avatar <name>`)"
    );
  }
  if (!hasMessageContent()) {
    logger.warn(
      "Message Content privilege is disabled. These features are limited:\n" +
        "- Prefix commands & hard replies\n" +
        "- AFK auto-removal, staff application reasons, QR scanning, snipe capture\n" +
        "Members will be informed the first time they hit a degraded path."
    );
  }
};