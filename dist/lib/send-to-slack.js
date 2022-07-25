var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * Renders notifications for Slack and then sends them
 */
function sendToSlack(core, slack, inputs, notifications) {
    return __awaiter(this, void 0, void 0, function* () {
        // On rollup, send all notifications in one message body
        if (inputs.rollupNotifications) {
            let blocks;
            let bodyText = "";
            for (const notification of notifications) {
                if (bodyText) {
                    bodyText += "\n\n";
                }
                bodyText += `<${notification.url}|${notification.subject.title}>`;
            }
            blocks = [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: "GitHub Notifications",
                    },
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: bodyText,
                    },
                },
            ];
            const text = `GitHub Notifications\n\n${bodyText}`;
            try {
                return slack.chat.postMessage({
                    blocks,
                    channel: inputs.destination,
                    text, // Fallback if blocks aren't available
                });
            }
            catch (error) {
                core.error(error);
                return core.setFailed(`Unable to send notification to Slack. Is your <slack-token> properly scoped to your <destination>?`);
            }
        }
        // If not rollup, send each notification individually
        for (const notification of notifications) {
            const text = `<${notification.url}|${notification.subject.title}>`;
            // Not promisified for rate limitting, wait 2 seconds between each message
            try {
                yield slack.chat.postMessage({
                    blocks: [
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text,
                            },
                        },
                    ],
                    channel: inputs.destination,
                    text,
                });
                yield delay(2000);
            }
            catch (error) {
                core.error(error);
                return core.setFailed(`Unable to send notification to Slack. Is your <slack-token> properly scoped to your <destination>?`);
            }
        }
    });
}
export default sendToSlack;
