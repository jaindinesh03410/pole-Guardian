import { initializeApp } from "firebase-admin/app";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import * as logger from "firebase-functions/logger";
import {
  isFunctionsEmulator,
  sendTelegramAlert,
  telegramSecrets,
  type FaultEventData,
} from "./sendTelegramAlert";

initializeApp();

setGlobalOptions({ maxInstances: 10 });

/**
 * Firestore trigger: new documents in `fault_events` invoke sendTelegramAlert.
 */
export const onNewFaultAlert = onDocumentCreated(
  {
    document: "fault_events/{faultId}",
    region: "us-central1",
    ...(isFunctionsEmulator() ? {} : { secrets: telegramSecrets }),
  },
  async (event) => {
    const snap = event.data;
    if (!snap) {
      logger.warn("onNewFaultAlert: event.data is undefined, skipping.");
      return;
    }

    await sendTelegramAlert(snap.data() as FaultEventData, event.params.faultId);
  }
);
