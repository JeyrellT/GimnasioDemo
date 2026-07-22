import { render } from "@react-email/components";
import * as React from "react";
import * as fs from "fs";
import * as path from "path";

// Inline the constants to avoid path alias issues
const APP_NAME = "Blackline Fitness";
const EMAIL_SUPPORT = "soporte@blacklinefitness.app";

// Import the template source directly — we'll inline it to dodge tsconfig paths
import InvitationEmail from "../src/lib/email/templates/invitation";
import ClientWelcomeEmail from "../src/lib/email/templates/client-welcome";

async function main() {
  const invitationHtml = await render(
    React.createElement(InvitationEmail, {
      trainerName: "Alex Benedict",
      invitationUrl: "https://blacklinefitness.app/invitacion?token=abc123demo",
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      appUrl: "http://localhost:8899",
    })
  );

  const welcomeHtml = await render(
    React.createElement(ClientWelcomeEmail, {
      trainerName: "Alex Benedict",
      welcomeUrl: "https://blacklinefitness.app/client/bienvenida?token=xyz789demo",
      appUrl: "http://localhost:8899",
    })
  );

  // Wrap both in a comparison page
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Email Preview</title>
<style>body{margin:0;padding:40px;background:#111;font-family:sans-serif}
h1{color:#fff;text-align:center;font-size:18px;margin:30px 0 10px}
.sep{border:0;border-top:1px solid #333;margin:40px auto;max-width:520px}
</style></head><body>
<h1>INVITACION (createInvitation)</h1>
${invitationHtml}
<hr class="sep">
<h1>BIENVENIDA (quickAddClient)</h1>
${welcomeHtml}
</body></html>`;

  const outPath = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), "..", "public", "email-preview.html");
  fs.writeFileSync(outPath, html, "utf-8");
  console.log("Preview saved to:", outPath);
}

main().catch(console.error);
