const nodemailer = require('nodemailer');

/**
 * Sends an email using Nodemailer
 * @param {string|string[]} recipients - Recipient email address(es)
 * @param {string} subject - Email subject
 * @param {string} content - Email content (HTML supported)
 * @param {Object} [options] - Additional options
 * @returns {Promise} Promise that resolves when email is sent
 */
async function sendEmail(recipients, subject, content, options = {}) {
    try {
        // Create transporter object using your email service
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Use any email service (Gmail, Outlook, etc.)
            auth: {
                user: process.env.EMAIL_USER, // Your email address
                pass: process.env.EMAIL_PASSWORD // Your email password/app password
            }
        });

        // Configure mail options
        const mailOptions = {
            from: process.env.EMAIL_USER, // Sender address
            to: Array.isArray(recipients) ? recipients.join(', ') : recipients, // Recipient(s)
            subject: subject, // Email subject
            html: content, // HTML body (use text for plain text)
            ...options // Merge any additional options (attachments, CC, BCC, etc.)
        };

        // Send email
        const result = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', result.messageId);
        return result;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}

// Example usage:
// sendEmail(
//     'recipient@example.com',
//     'Test Email Subject',
//     '<h1>Hello!</h1><p>This is a <strong>test email</strong>.</p>'
// );

// sendEmail(
//     ['user1@example.com', 'user2@example.com'],
//     'Group Email',
//     '<p>This email is sent to multiple recipients.</p>'
// );