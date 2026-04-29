import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Resend } from "resend";
import twilio from "twilio";

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize notification services lazily
let resend: Resend | null = null;
const getResend = () => {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

let twilioClient: any = null;
const getTwilio = () => {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
};

// API Routes
app.post("/api/notify-registration", async (req, res) => {
  const { email, studentName, parentName, program, whatsapp } = req.body;

  try {
    const results: any = { email: false, whatsapp: false };

    // 1. Email via Resend
    const resendClient = getResend();
    if (resendClient && email) {
      await resendClient.emails.send({
        from: "Cricket Foundation <notifications@resend.dev>", // Replace with verified domain in prod
        to: email,
        subject: `Enrollment Received: ${studentName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #eee; padding: 20px;">
            <h2 style="color: #0f172a; border-bottom: 2px solid #0f172a; padding-bottom: 10px;">Enrollment Registered</h2>
            <p>Dear ${parentName},</p>
            <p>Thank you for registering <strong>${studentName}</strong> with our <strong>${program}</strong> program.</p>
            <p>We have received the details and our team will review the application shortly.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #64748b;">This is an automated confirmation from the Cricket Development Foundation.</p>
          </div>
        `
      });
      results.email = true;
    }

    // 2. WhatsApp via Twilio
    const twilioC = getTwilio();
    if (twilioC && whatsapp && process.env.TWILIO_PHONE_NUMBER) {
      const recipient = process.env.WHATSAPP_RECIPIENT_OVERRIDE || `whatsapp:${whatsapp}`;
      await twilioC.messages.create({
        from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
        to: recipient,
        body: `*Spark Cricket Foundation*\nHello ${parentName}, registration for ${studentName} (${program}) has been received successfully! 🏏`
      });
      results.whatsapp = true;
    }

    res.json({ success: true, results });
  } catch (error: any) {
    console.error("Notification error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/notify-payment", async (req, res) => {
  const { email, studentName, whatsapp } = req.body;

  try {
    const results: any = { email: false, whatsapp: false };
    const resendClient = getResend();
    if (resendClient && email) {
      await resendClient.emails.send({
        from: "Cricket Foundation <notifications@resend.dev>",
        to: email,
        subject: `Payment Confirmed: ${studentName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #eee; padding: 20px;">
            <h2 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 10px;">Payment Received</h2>
            <p>The fee payment for <strong>${studentName}</strong> has been successfully verified.</p>
            <p>The student is now fully enrolled. See you on the field!</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          </div>
        `
      });
      results.email = true;
    }

    const twilioC = getTwilio();
    if (twilioC && whatsapp && process.env.TWILIO_PHONE_NUMBER) {
      const recipient = process.env.WHATSAPP_RECIPIENT_OVERRIDE || `whatsapp:${whatsapp}`;
      await twilioC.messages.create({
        from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
        to: recipient,
        body: `*Spark Cricket Foundation*\nPayment verified for ${studentName}! Your enrollment is now active. Welcome to the club! ✅`
      });
      results.whatsapp = true;
    }

    res.json({ success: true, results });
  } catch (error: any) {
    console.error("Payment notification error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Vite Middleware/Static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is booting on port ${PORT}...`);
    console.log(`App environment: ${process.env.NODE_ENV}`);
  });
}

startServer();
