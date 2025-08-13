const db = require('../db');

/**
 * @desc    Register the logged-in user as a donor
 */
exports.registerAsDonor = async (req, res) => {
    const userId = req.user.id;
    try {
        const [existingDonor] = await db.query('SELECT id FROM donors WHERE user_id = ?', [userId]);
        if (existingDonor.length > 0) {
            return res.status(400).json({ message: 'You are already registered as a donor. Thank you!' });
        }
        const [users] = await db.query('SELECT blood_group FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const userBloodGroup = users[0].blood_group;
        await db.query(
            'INSERT INTO donors (user_id, blood_group, availability_status) VALUES (?, ?, ?)',
            [userId, userBloodGroup, 'available']
        );
        res.status(201).json({ message: 'Successfully registered as a donor!' });
    } catch (error) {
        console.error("Error in registerAsDonor:", error);
        res.status(500).json({ message: 'Server error while registering as donor.' });
    }
};

/**
 * @desc    Search for available donors, excluding the user making the request.
 * @route   GET /api/donors/search
 */
exports.searchDonors = async (req, res) => {
    const { bloodGroup, address } = req.query;
    const searcherId = req.user.id; 

    if (!bloodGroup) {
        return res.status(400).json({ message: 'Blood group query parameter is required.' });
    }

    try {
        let query = `
            SELECT 
                u.id, 
                u.full_name, 
                u.address, 
                d.blood_group
            FROM donors d
            INNER JOIN users u ON d.user_id = u.id
            WHERE 
                TRIM(d.blood_group) = ? 
                AND TRIM(d.availability_status) = 'available'
                AND u.id != ?
        `;
        
        const queryParams = [bloodGroup, searcherId];

        // --- THE CRITICAL FIX IS HERE ---
        // Use LOWER() on both the database column and the provided search term
        // to ensure the search is case-insensitive (e.g., 'mumbai' will match 'Mumbai').
        if (address && address.trim() !== '') {
            query += ' AND LOWER(u.address) LIKE LOWER(?)';
            queryParams.push(`%${address.trim()}%`);
        }
        
        const [donors] = await db.query(query, queryParams);
        
        res.status(200).json(donors);

    } catch (error)
    {
        console.error("Error in searchDonors:", error);
        res.status(500).json({ message: 'Server error while searching for donors.' });
    }
};

/**
 * @desc    Get the donor-specific profile for the logged-in user
 */
exports.getDonorProfile = async (req, res) => {
    const userId = req.user.id; 
    try {
        const [donorProfile] = await db.query('SELECT * FROM donors WHERE user_id = ?', [userId]);
        if (donorProfile.length === 0) {
            return res.status(404).json({ message: "Donor profile not found. User has not registered as a donor." });
        }
        res.status(200).json(donorProfile[0]);
    } catch (error) {
        console.error("Error fetching donor profile:", error);
        res.status(500).json({ message: "Server error fetching profile." });
    }
};

/**
 * @desc    Update the availability status of the logged-in donor
 */
exports.updateDonorStatus = async (req, res) => {
    const userId = req.user.id;
    const { newStatus } = req.body; 

    if (newStatus !== 'available' && newStatus !== 'unavailable') {
        return res.status(400).json({ message: "Invalid status provided. Must be 'available' or 'unavailable'." });
    }
    try {
        const [result] = await db.query(
            'UPDATE donors SET availability_status = ? WHERE user_id = ?',
            [newStatus, userId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Could not find a donor profile for your account." });
        }
        res.status(200).json({ message: `Your donation status has been updated to '${newStatus}'.` });
    } catch (error) {
        console.error("Error updating donor status:", error);
        res.status(500).json({ message: "Server error while updating status." });
    }
};