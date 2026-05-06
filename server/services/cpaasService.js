import axios from 'axios';

// Veevotech CPaaS SMS Service
class CPaaS {
    constructor() {
        this.apiUrl = 'https://api.veevotech.com/v3/sendsms';
        // Fallback: Use hardcoded values if env variables don't load
        this.apiKey = process.env.VEEVOTECH_API_KEY || '6d239e242dcfd02b64d9738f1b9d2724';
        this.senderID = process.env.VEEVOTECH_SENDER_ID || 'Default';

        console.log('[CPaaS] Initialization - API Key Loaded:', this.apiKey ? '✅ YES' : '❌ NO');
    }

    /**
     * Send SMS using Veevotech CPaaS API
     * @param {string} phoneNumber - Receiver phone number (e.g., +923001234567)
     * @param {string} message - SMS message text
     * @returns {Promise<object>} API response
     */
    async sendSMS(phoneNumber, message) {
        try {
            if (!this.apiKey) {
                console.error('[CPaaS] VEEVOTECH_API_KEY not set in environment');
                return { success: false, error: 'API Key not configured' };
            }

            if (!phoneNumber || !message) {
                console.error('[CPaaS] Missing phone number or message');
                return { success: false, error: 'Phone number and message required' };
            }

            // normalize phone number to E.164 (add +92 for local pakistani numbers)
            let normalized = phoneNumber.toString().trim();
            // strip non-digits except leading plus
            const hasPlus = normalized.startsWith('+');
            normalized = normalized.replace(/[^\d]/g, '');
            if (!hasPlus) {
                // common local mobile patterns:
                // 11 digits starting with 0 (e.g. 03001234567) -> drop leading 0 and add 92
                if (normalized.length === 11 && normalized.startsWith('0')) {
                    normalized = '92' + normalized.slice(1);
                }
                // 10 digits starting with 3 (e.g. 3001234567) -> assume missing leading 0
                else if (normalized.length === 10 && normalized.startsWith('3')) {
                    normalized = '92' + normalized;
                }
                // 10 digits starting with 03 (should be covered above but just in case)
                else if (normalized.length === 10 && normalized.startsWith('03')) {
                    normalized = '92' + normalized;
                }
            }
            if (!normalized.startsWith('+')) {
                normalized = '+' + normalized;
            }

            const payload = {
                hash: this.apiKey,
                receivernum: normalized,
                sendernum: this.senderID,
                textmessage: message
            };
            phoneNumber = normalized; // for logging

            console.log('[CPaaS] Sending SMS:', {
                to: phoneNumber,
                senderID: this.senderID,
                messageLength: message.length
            });

            const response = await axios.post(this.apiUrl, payload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            });

            console.log('[CPaaS] SMS sent successfully:', response.data);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('[CPaaS] Error sending SMS:', error.message);
            return { success: false, error: error.message };
        }
    }



    /**
     * Send custom SMS
     * @param {string} phoneNumber - Receiver phone number
     * @param {string} message - Custom message
     * @returns {Promise<object>}
     */
    async sendCustomSMS(phoneNumber, message) {
        return this.sendSMS(phoneNumber, message);
    }

    /**
     * Normalize phone number to E.164 the same way sendSMS does.
     * Useful for storing numbers in the database.
     * @param {string} phoneNumber
     * @returns {string} normalized phone or original if unable to parse
     */
    normalizeNumber(phoneNumber) {
        if (!phoneNumber) return phoneNumber;
        let normalized = phoneNumber.toString().trim();
        const hasPlus = normalized.startsWith('+');
        normalized = normalized.replace(/[^\d]/g, '');
        if (!hasPlus) {
            if (normalized.length === 11 && normalized.startsWith('0')) {
                normalized = '92' + normalized.slice(1);
            } else if (normalized.length === 10 && normalized.startsWith('3')) {
                normalized = '92' + normalized;
            } else if (normalized.length === 10 && normalized.startsWith('03')) {
                normalized = '92' + normalized;
            }
        }
        if (!normalized.startsWith('+')) {
            normalized = '+' + normalized;
        }
        return normalized;
    }
}

export default new CPaaS();
