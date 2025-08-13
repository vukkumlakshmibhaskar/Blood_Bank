const db = require('../db');
const nodemailer = require('nodemailer');

// Setup Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

exports.approveRequest = async (req, res) => {
    const { id: requestId } = req.params;
    const adminId = req.user.id;

    try {
        const [requests] = await db.query('SELECT * FROM blood_requests WHERE id = ? AND status = "pending"', [requestId]);
        if (requests.length === 0) {
            return res.status(404).json({ message: 'Request not found or has already been processed.' });
        }
        const bloodRequest = requests[0];

        const [availableDonors] = await db.query(
            'SELECT user_id FROM donors WHERE blood_group = ? AND availability_status = "available" AND user_id != ?',
            [bloodRequest.required_blood_group, bloodRequest.recipient_user_id]
        );
        if (availableDonors.length === 0) {
            return res.status(404).json({ message: `No available donors found for blood group ${bloodRequest.required_blood_group}. Cannot approve.` });
        }
        const assignedDonorId = availableDonors[0].user_id;

        const [recipientUsers] = await db.query('SELECT email, full_name FROM users WHERE id = ?', [bloodRequest.recipient_user_id]);
        if (recipientUsers.length === 0) {
            throw new Error("Could not find the recipient user's details.");
        }
        const recipient = recipientUsers[0];

        await db.query(
            'UPDATE blood_requests SET status = ?, approved_by_admin_id = ?, assigned_donor_id = ? WHERE id = ?',
            ['approved', adminId, assignedDonorId, requestId]
        );

        await transporter.sendMail({
            from: `"LifeBlood App" <${process.env.EMAIL_USER}>`,
            to: recipient.email,
            subject: '✅ Your Blood Request has been Approved!',
            html: `<h3>Hello ${recipient.full_name},</h3><p>Great news! Your blood request (ID: ${requestId}) has been approved and a donor has been assigned.</p><p>Please log in to the app and go to the "My Chats" section to coordinate with the donor directly.</p><br><p>Thank you,</p><p><b>The LifeBlood Team</b></p>`
        });

        res.status(200).json({ message: 'Request approved, donor assigned, and notification sent.' });

    } catch (error) {
        console.error(`--- ADMIN ACTION FAILED on Request ID ${requestId} ---`, error);
        res.status(500).json({ message: 'A server error occurred while approving the request.' });
    }
};

exports.getPendingRequests = async (req, res) => {
    try {
        const query = `
            SELECT br.id, br.required_blood_group, br.hospital_name, br.status,
                   br.created_at, u.full_name AS recipient_name, u.email AS recipient_email
            FROM blood_requests br
            JOIN users u ON br.recipient_user_id = u.id
            WHERE TRIM(br.status) = 'pending'
            ORDER BY br.created_at ASC
        `;
        const [requests] = await db.query(query);
        res.status(200).json(requests);
    } catch (error) {
        console.error("ADMIN DASHBOARD ERROR:", error);
        res.status(500).json({ message: 'Server error fetching requests.' });
    }
};

exports.rejectRequest = async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id;
    try {
        const [result] = await db.query(
            'UPDATE blood_requests SET status = ?, approved_by_admin_id = ? WHERE id = ? AND status = "pending"',
            ['rejected', adminId, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Request not found or has already been processed.' });
        }
        res.status(200).json({ message: 'Request rejected successfully.' });
    } catch (error) {
        console.error(`ADMIN ACTION ERROR - Failed to reject request ${id}:`, error);
        res.status(500).json({ message: 'Server error while rejecting the request.' });
    }
};