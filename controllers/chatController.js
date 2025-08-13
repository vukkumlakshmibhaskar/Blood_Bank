const db = require('../db');

exports.getConversations = async (req, res) => {
    const userId = req.user.id;
    try {
        const query = `
            SELECT br.id, br.required_blood_group, u_recipient.full_name AS recipient_name, u_donor.full_name AS donor_name
            FROM blood_requests br
            JOIN users u_recipient ON br.recipient_user_id = u_recipient.id
            JOIN users u_donor ON br.assigned_donor_id = u_donor.id
            WHERE (br.recipient_user_id = ? OR br.assigned_donor_id = ?) AND br.status = 'approved'
        `;
        const [conversations] = await db.query(query, [userId, userId]);
        res.status(200).json(conversations);
    } catch (error) {
        console.error("Error fetching conversations:", error);
        res.status(500).json({ message: "Server error." });
    }
};

exports.getMessages = async (req, res) => {
    const { requestId } = req.params;
    try {
        const [messages] = await db.query(
            'SELECT * FROM chat_messages WHERE request_id = ? ORDER BY timestamp ASC',
            [requestId]
        );
        res.status(200).json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ message: "Server error." });
    }
};