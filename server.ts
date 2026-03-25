import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Initialize Firebase Admin
let dbAdmin: FirebaseFirestore.Firestore;
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (getApps().length === 0) {
      const initOptions: any = {
        projectId: config.projectId,
      };
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
          initOptions.credential = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
        } catch (e) {
          console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT JSON', e);
        }
      }
      const app = initializeApp(initOptions);
      dbAdmin = getFirestore(app, config.firestoreDatabaseId);
      console.log('Firebase Admin initialized successfully.');
    } else {
      dbAdmin = getFirestore(getApps()[0], config.firestoreDatabaseId);
    }
  } else {
    console.warn('firebase-applet-config.json not found. Admin SDK not initialized.');
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
}

// Setup Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function checkAndSendAlerts() {
  if (!dbAdmin) return;
  
  // Check if we have explicit credentials, otherwise ADC might fail across projects
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log('ℹ️ FIREBASE_SERVICE_ACCOUNT not configured. Background worker requires a service account key to access Firestore across projects. Skipping auto-alerts.');
    return;
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('ℹ️ SMTP is not fully configured. Email notifications will be logged but not sent.');
  }

  try {
    console.log('[Background Worker] Checking for expiring files...');
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const filesSnapshot = await dbAdmin.collection('files').get();
    
    for (const doc of filesSnapshot.docs) {
      const file = doc.data();
      if (!file.expiryDate) continue;

      const expiryDate = new Date(file.expiryDate);
      
      // Check if expiry is within 30 days and in the future
      if (expiryDate <= thirtyDaysFromNow && expiryDate >= now) {
        // Check if we already sent an email recently (within 7 days)
        const logsSnapshot = await dbAdmin.collection('email_logs')
          .where('fileId', '==', doc.id)
          .orderBy('sentAt', 'desc')
          .limit(1)
          .get();

        let shouldSend = true;
        if (!logsSnapshot.empty) {
          const lastLog = logsSnapshot.docs[0].data();
          const lastSent = new Date(lastLog.sentAt);
          const daysSinceLastSent = (now.getTime() - lastSent.getTime()) / (1000 * 3600 * 24);
          if (daysSinceLastSent < 7) {
            shouldSend = false;
          }
        }

        if (shouldSend) {
          // Get client email
          const clientDoc = await dbAdmin.collection('clients').doc(file.clientId).get();
          if (clientDoc.exists) {
            const client = clientDoc.data();
            if (client?.email) {
              console.log(`[Background Worker] Sending auto alert to ${client.email} for file ${file.name}`);
              
              if (process.env.SMTP_USER && process.env.SMTP_PASS) {
                try {
                  await transporter.sendMail({
                    from: process.env.SMTP_FROM || `"نظام المحاسب القانوني" <${process.env.SMTP_USER}>`,
                    to: client.email,
                    subject: `تنبيه: اقتراب موعد انتهاء صلاحية ملف (${file.name})`,
                    html: `
                      <div dir="rtl" style="text-align: right; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; margin: 0 auto; background-color: #f8fafc;">
                        <h2 style="color: #1e3a8a;">تنبيه هام من مكتب المحاسب القانوني</h2>
                        <p>عزيزي العميل <strong>${client.name}</strong>،</p>
                        <p>نود إعلامكم بأن الملف التالي الخاص بكم يوشك على الانتهاء:</p>
                        <div style="background-color: #ffffff; padding: 15px; border-radius: 6px; border-right: 4px solid #f59e0b; margin: 15px 0;">
                          <p style="margin: 5px 0;"><strong>اسم الملف:</strong> ${file.name}</p>
                          <p style="margin: 5px 0;"><strong>تاريخ الانتهاء:</strong> ${expiryDate.toLocaleDateString('ar-EG')}</p>
                        </div>
                        <p>يرجى التواصل معنا في أقرب وقت للبدء في إجراءات التجديد وتفادي أي غرامات.</p>
                        <br/>
                        <p>مع تحيات،<br/>فريق العمل</p>
                      </div>
                    `
                  });
                  console.log(`[Background Worker] Email sent successfully to ${client.email}`);
                } catch (emailErr) {
                  console.error(`[Background Worker] Failed to send email to ${client.email}:`, emailErr);
                }
              }

              // Log the attempt
              await dbAdmin.collection('email_logs').add({
                fileId: doc.id,
                clientId: file.clientId,
                clientEmail: client.email,
                sentAt: now.toISOString(),
                type: 'auto'
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('[Background Worker] Error in auto email alerts:', error);
  }
}

// Run cron job every day at midnight
cron.schedule('0 0 * * *', () => {
  checkAndSendAlerts();
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to manually trigger alerts (for testing)
  app.get('/api/cron/alerts', async (req, res) => {
    await checkAndSendAlerts();
    res.json({ status: 'success', message: 'Alerts check completed.' });
  });

  // API Route to manually send a specific alert
  app.post('/api/alerts/send', async (req, res) => {
    const { fileId, clientId, clientEmail, fileName, expiryDate, clientName } = req.body;
    
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(400).json({ error: 'SMTP credentials not configured.' });
    }

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"نظام المحاسب القانوني" <${process.env.SMTP_USER}>`,
        to: clientEmail,
        subject: `تنبيه: اقتراب موعد انتهاء صلاحية ملف (${fileName})`,
        html: `
          <div dir="rtl" style="text-align: right; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; margin: 0 auto; background-color: #f8fafc;">
            <h2 style="color: #1e3a8a;">تنبيه هام من مكتب المحاسب القانوني</h2>
            <p>عزيزي العميل <strong>${clientName}</strong>،</p>
            <p>نود إعلامكم بأن الملف التالي الخاص بكم يوشك على الانتهاء:</p>
            <div style="background-color: #ffffff; padding: 15px; border-radius: 6px; border-right: 4px solid #f59e0b; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>اسم الملف:</strong> ${fileName}</p>
              <p style="margin: 5px 0;"><strong>تاريخ الانتهاء:</strong> ${new Date(expiryDate).toLocaleDateString('ar-EG')}</p>
            </div>
            <p>يرجى التواصل معنا في أقرب وقت للبدء في إجراءات التجديد وتفادي أي غرامات.</p>
            <br/>
            <p>مع تحيات،<br/>فريق العمل</p>
          </div>
        `
      });

      if (dbAdmin && process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
          await dbAdmin.collection('email_logs').add({
            fileId,
            clientId,
            clientEmail,
            sentAt: new Date().toISOString(),
            type: 'manual'
          });
        } catch (dbErr) {
          console.error('Failed to log manual email to Firestore:', dbErr);
        }
      } else {
        console.log('ℹ️ FIREBASE_SERVICE_ACCOUNT not configured. Skipping email log to Firestore.');
      }

      res.json({ status: 'success' });
    } catch (error) {
      console.error('Manual email send error:', error);
      res.status(500).json({ error: 'Failed to send email' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Run once on startup
    setTimeout(checkAndSendAlerts, 5000);
  });
}

startServer();
