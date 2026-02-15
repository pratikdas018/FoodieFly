import User from "../models/user.model.js";

const isAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId).select("role accountStatus");
        if (!user) {
            return res.status(401).json({ message: "user not found" });
        }
        if (user.accountStatus === "suspended") {
            return res.status(403).json({ message: "account suspended by admin" });
        }
        if (user.role !== "admin") {
            return res.status(403).json({ message: "admin access only" });
        }
        next();
    } catch (error) {
        return res.status(500).json({ message: `isAdmin error ${error}` });
    }
};

export default isAdmin;
