// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const { scrapeOTP } = require('./playwrightService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Key কনফিগ
const SERVER27_KEY = 'KG58JF72JG';
const API_KEY_1 = 'test123';

// সেশন ম্যানেজমেন্ট
const sessions = new Map();

// ==========================================
// ১. NID ভ্যালিডেশন (Server27 API)
// ==========================================
app.post('/api/verify-nid', async (req, res) => {
  const { nid, dob } = req.body;
  
  if (!nid || !dob) return res.status(400).json({ success: false, error: 'NID এবং DOB প্রয়োজন' });

  try {
    const apiUrl = `https://api.server27.xyz/sCopy/json.php?key=${SERVER27_KEY}&nid=${nid}&dob=${dob}`;
    const response = await axios.get(apiUrl);
    const data = response.data;

    if (data && data.status === 'success') {
      const sessionId = Date.now().toString();
      const session = {
        nid,
        dob,
        nameBn: data.nameBn,
        photoUrl: data.photo,
        step: 1,
        progress: { step: 1, percent: 5, message: 'NID ভ্যালিডেশন সফল' },
        otpScraped: false,
        completed: false,
        error: null
      };
      sessions.set(sessionId, session);

      res.json({
        success: true,
        sessionId,
        nidPreview: {
          photo: data.photo,
          nameBn: data.nameBn,
          voterArea: data.voterArea || 'N/A',
          presentAddress: data.presentAddress || {}
        }
      });
    } else {
      res.json({ success: false, error: 'NID বা DOB ভ্যালিড নয়' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'সার্ভার ত্রুটি' });
  }
});

// ==========================================
// ২. OTP স্ক্র্যাপিং ট্রিগার (Playwright)
// ==========================================
app.post('/api/start-claim', async (req, res) => {
  const { nid, dob, sessionId } = req.body;
  const session = sessions.get(sessionId);

  if (!session) return res.status(404).json({ success: false, error: 'সেশন পাওয়া যায়নি' });

  try {
    // Playwright দিয়ে OTP স্ক্র্যাপ করা
    const otp = await scrapeOTP(nid, dob);
    
    session.otpScraped = otp;
    session.progress = { step: 3, percent: 30, message: `OTP স্ক্র্যাপ করা হয়েছে: ${otp}` };
    sessions.set(sessionId, session);

    res.json({ success: true, otp: otp });

  } catch (err) {
    session.error = err.message;
    sessions.set(sessionId, session);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// ৩. স্ট্যাটাস পোলিং
// ==========================================
app.get('/api/claim-status', (req, res) => {
  const sessionId = req.query.sessionId;
  const session = sessions.get(sessionId);

  if (!session) return res.status(404).json({ success: false, error: 'সেশন পাওয়া যায়নি' });

  if (session.completed) {
    return res.json({ pending: false, result: session });
  }

  // প্রগ্রেস অ্যাডভান্সমেন্ট
  if (session.otpScraped) {
    session.progress = { step: 4, percent: 50, message: 'OTP সফলভাবে সাবমিট করা হয়েছে' };
    sessions.set(sessionId, session);
  }

  res.json({ pending: true, progress: session.progress });
});

app.listen(PORT, () => {
  console.log(`🚀 Final Server Running: http://localhost:${PORT}`);
});
