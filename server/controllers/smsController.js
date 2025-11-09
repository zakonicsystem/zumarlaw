import axios from 'axios';
import SmsLog from '../models/SmsLog.js';

const VEEVOTECH_ENDPOINT = process.env.VEEVOTECH_SMS_ENDPOINT || 'https://api.veevotech.com/v3/sendsms';
const API_KEY = process.env.VEEVOTECH_SMS_API_KEY || process.env.VEEVOTECH_API_KEY || process.env.SMS_API_KEY;
const DEFAULT_SENDER = process.env.VEEVOTECH_SMS_SENDER || process.env.SMS_SENDER || 'Default';

export const sendSms = async (req, res) => {
  try {
    // Log who triggered the SMS if available (non-blocking auth may attach req.user)
    if (req.user) {
      console.log('[sendSms] Triggered by user:', req.user);
    } else {
      console.log('[sendSms] Triggered by unauthenticated request');
    }
    if (!API_KEY) {
      const msg = 'SMS API key not configured on server (VEEVOTECH_SMS_API_KEY)';
      console.warn('[sendSms] ' + msg);
      // In development we can simulate a send so frontend flows can be tested without provider key
      if (process.env.NODE_ENV === 'development' || process.env.DEBUG_SMS === 'true') {
        console.log('[sendSms] Development mode: simulating SMS send');
        return res.json({ success: true, simulated: true, message: 'Simulated SMS send (no API key configured)' });
      }
      return res.status(500).json({ error: msg });
    }

    const { to, message, sender, network } = req.body;
    if (!to || !message) return res.status(400).json({ error: 'Missing "to" or "message" in request body' });

    // Normalize phone number for common local format (if starts with '03' -> '+92...')
    let normalizedTo = to;
    if (typeof normalizedTo === 'string') {
      const digits = normalizedTo.replace(/\s|-/g, '');
      if (/^03\d{9}$/.test(digits)) {
        normalizedTo = '+92' + digits.slice(1);
      }
    }

    const payload = {
      // include both parameter names to be compatible with variations in docs
      apikey: API_KEY,
      hash: API_KEY,
      receivernum: normalizedTo,
      sendernum: sender || DEFAULT_SENDER,
      textmessage: message,
    };
    // optionally include network if provided
    if (network) payload.network = network;

    // Persist a pending log for audit
    const log = await SmsLog.create({
      to: normalizedTo,
      message,
      sender: payload.sendernum,
      user: req.user || null,
      status: 'pending'
    });

    // Try POST (preferred). If POST fails, we'll try GET fallback.
    try {
      const resp = await axios.post(VEEVOTECH_ENDPOINT, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      });

      // update log
      log.status = 'success';
      log.providerResponse = resp.data;
      await log.save();

      return res.json({ success: true, provider: resp.data });
    } catch (postErr) {
      console.warn('[sendSms] POST to provider failed, attempting GET fallback', postErr?.message);
      // attempt GET fallback using query string params
      try {
        const qs = new URLSearchParams();
        Object.entries(payload).forEach(([k, v]) => { if (v !== undefined && v !== null) qs.append(k, String(v)); });
        const url = `${VEEVOTECH_ENDPOINT}?${qs.toString()}`;
        const resp = await axios.get(url, { timeout: 15000 });

        log.status = 'success';
        log.providerResponse = resp.data;
        await log.save();

        return res.json({ success: true, provider: resp.data, fallback: true });
      } catch (getErr) {
        console.error('[sendSms] GET fallback also failed', getErr?.message || getErr);
        // update log with failure
        log.status = 'failed';
        log.error = {
          postError: postErr?.response?.data || postErr?.message,
          getError: getErr?.response?.data || getErr?.message
        };
        await log.save();

        const status = getErr?.response?.status || postErr?.response?.status || 500;
        const data = getErr?.response?.data || postErr?.response?.data || { message: getErr?.message || postErr?.message };
        return res.status(status).json({ error: 'Failed to send sms', details: data });
      }
    }
  } catch (err) {
    // Improved logging for debugging
    console.error('[sendSms] error:', err?.message || err);
    if (err?.response) {
      console.error('[sendSms] provider response status:', err.response.status);
      console.error('[sendSms] provider response data:', JSON.stringify(err.response.data));
    }
    const status = err?.response?.status || 500;
    const data = err?.response?.data || { message: err.message };
    return res.status(status).json({ error: 'Failed to send sms', details: data });
  }
};
