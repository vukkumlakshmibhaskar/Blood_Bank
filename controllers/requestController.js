const db = require('../db');

exports.createRequest = async (req, res) => {
    const recipientUserId = req.user.id;
    const { requiredBloodGroup, hospitalName } = req.body;

    if (!requiredBloodGroup || !hospitalName) {
        return res.status(400).json({ message: 'Blood group and hospital name are required.' });
    }

    try {
        await db.query(
            'INSERT INTO blood_requests (recipient_user_id, required_blood_group, hospital_name, status) VALUES (?, ?, ?, ?)',
            [recipientUserId, requiredBloodGroup, hospitalName, 'pending']
        );
        
        res.status(201).json({ message: 'Blood request created successfully. You can check its status on the "My Requests" page.' });

    } catch (error) {
        console.error("CREATE REQUEST ERROR:", error);
        res.status(500).json({ message: 'Server error while creating the request.' });
    }
};

exports.getMyRequests = async (req, res) => {
    const userId = req.user.id;

    try {
        const [requests] = await db.query(
            'SELECT * FROM blood_requests WHERE recipient_user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        
        res.status(200).json(requests);

    } catch (error) {
        console.error(`MY REQUESTS ERROR - Failed to fetch requests for user ${userId}:`, error);
        res.status(500).json({ message: "Server error while fetching your requests." });
    }
};