import DeliveryAssignment from "../models/deliveryAssignment.model.js";
import Dispute from "../models/dispute.model.js";
import Order from "../models/order.model.js";
import Shop from "../models/shop.model.js";
import User from "../models/user.model.js";

const parsePagination = (query) => {
    const page = Math.max(1, Number(query?.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query?.limit || 20)));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

const buildNotification = ({ type, title, message, route = "/" }) => ({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    title,
    message,
    route,
    createdAt: new Date().toISOString()
});

const emitNotification = (io, socketId, payload) => {
    if (!io || !socketId) return;
    io.to(socketId).emit("notification", payload);
};

export const getAdminOverview = async (req, res) => {
    try {
        const [userAgg, shopAgg, disputeAgg, totalOrders, pendingShopOrders, assignmentAgg] = await Promise.all([
            User.aggregate([
                { $group: { _id: { role: "$role", status: "$accountStatus" }, count: { $sum: 1 } } }
            ]),
            Shop.aggregate([
                { $group: { _id: "$adminStatus", count: { $sum: 1 } } }
            ]),
            Dispute.aggregate([
                { $group: { _id: "$status", count: { $sum: 1 } } }
            ]),
            Order.countDocuments(),
            Order.aggregate([
                { $unwind: "$shopOrders" },
                { $match: { "shopOrders.status": { $in: ["pending", "preparing", "out of delivery"] } } },
                { $count: "count" }
            ]),
            DeliveryAssignment.aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        const userStats = {
            user: { active: 0, suspended: 0 },
            owner: { active: 0, suspended: 0 },
            deliveryBoy: { active: 0, suspended: 0 },
            admin: { active: 0, suspended: 0 }
        };
        userAgg.forEach((entry) => {
            const role = entry?._id?.role;
            const status = entry?._id?.status;
            if (!userStats[role]) return;
            userStats[role][status] = Number(entry?.count || 0);
        });

        const shopStats = { active: 0, suspended: 0 };
        shopAgg.forEach((entry) => {
            const status = entry?._id || "active";
            shopStats[status] = Number(entry?.count || 0);
        });

        const disputeStats = { open: 0, in_review: 0, resolved: 0, rejected: 0 };
        disputeAgg.forEach((entry) => {
            const status = entry?._id || "open";
            disputeStats[status] = Number(entry?.count || 0);
        });

        const assignmentStats = { brodcasted: 0, assigned: 0, completed: 0 };
        assignmentAgg.forEach((entry) => {
            assignmentStats[entry?._id] = Number(entry?.count || 0);
        });

        return res.status(200).json({
            users: userStats,
            shops: shopStats,
            disputes: disputeStats,
            deliveryAssignments: assignmentStats,
            totalOrders,
            pendingShopOrders: Number(pendingShopOrders?.[0]?.count || 0)
        });
    } catch (error) {
        return res.status(500).json({ message: `admin overview error ${error}` });
    }
};

export const getManagedUsers = async (req, res) => {
    try {
        const { role = "", status = "", q = "" } = req.query;
        const { page, limit, skip } = parsePagination(req.query);
        const query = {};

        if (role) {
            query.role = role;
        }
        if (status) {
            query.accountStatus = status;
        }
        if (q) {
            query.$or = [
                { fullName: { $regex: q, $options: "i" } },
                { email: { $regex: q, $options: "i" } },
                { mobile: { $regex: q, $options: "i" } }
            ];
        }

        const [total, users] = await Promise.all([
            User.countDocuments(query),
            User.find(query)
                .select("-password -resetOtp -otpExpires -isOtpVerified")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
        ]);

        return res.status(200).json({
            users,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return res.status(500).json({ message: `get managed users error ${error}` });
    }
};

export const updateManagedUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;
        if (!["active", "suspended"].includes(status)) {
            return res.status(400).json({ message: "status must be active or suspended" });
        }
        if (String(userId) === String(req.userId)) {
            return res.status(400).json({ message: "you cannot change your own status" });
        }

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(400).json({ message: "user not found" });
        }

        if (targetUser.role === "admin") {
            return res.status(400).json({ message: "admin account status cannot be changed here" });
        }

        targetUser.accountStatus = status;
        if (status === "suspended") {
            targetUser.socketId = null;
            targetUser.isOnline = false;
        }
        await targetUser.save();

        if (targetUser.role === "owner") {
            await Shop.updateMany(
                { owner: targetUser._id },
                { adminStatus: status === "suspended" ? "suspended" : "active" }
            );
        }

        const safeUser = await User.findById(userId).select("-password -resetOtp -otpExpires -isOtpVerified");
        return res.status(200).json({
            message: "user status updated",
            user: safeUser
        });
    } catch (error) {
        return res.status(500).json({ message: `update managed user status error ${error}` });
    }
};

export const updateManagedUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;
        const allowedRoles = ["user", "owner", "deliveryBoy"];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ message: "invalid role" });
        }
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(400).json({ message: "user not found" });
        }
        if (targetUser.role === "admin") {
            return res.status(400).json({ message: "admin role cannot be updated" });
        }

        targetUser.role = role;
        await targetUser.save();
        const safeUser = await User.findById(userId).select("-password -resetOtp -otpExpires -isOtpVerified");
        return res.status(200).json({
            message: "user role updated",
            user: safeUser
        });
    } catch (error) {
        return res.status(500).json({ message: `update managed user role error ${error}` });
    }
};

export const getManagedShops = async (req, res) => {
    try {
        const { status = "", q = "" } = req.query;
        const { page, limit, skip } = parsePagination(req.query);
        const query = {};

        if (status) {
            query.adminStatus = status;
        }
        if (q) {
            query.$or = [
                { name: { $regex: q, $options: "i" } },
                { city: { $regex: q, $options: "i" } },
                { state: { $regex: q, $options: "i" } },
                { address: { $regex: q, $options: "i" } }
            ];
        }

        const [total, shops] = await Promise.all([
            Shop.countDocuments(query),
            Shop.find(query)
                .populate("owner", "fullName email mobile role accountStatus")
                .populate("items", "_id name category inStock")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
        ]);

        return res.status(200).json({
            shops,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return res.status(500).json({ message: `get managed shops error ${error}` });
    }
};

export const updateManagedShopStatus = async (req, res) => {
    try {
        const { shopId } = req.params;
        const { status } = req.body;
        if (!["active", "suspended"].includes(status)) {
            return res.status(400).json({ message: "status must be active or suspended" });
        }
        const shop = await Shop.findById(shopId).populate("owner", "socketId");
        if (!shop) {
            return res.status(400).json({ message: "shop not found" });
        }
        shop.adminStatus = status;
        await shop.save();

        const io = req.app.get("io");
        emitNotification(io, shop?.owner?.socketId, buildNotification({
            type: "shop_status",
            title: "Shop status updated",
            message: `${shop.name} is now ${status}.`,
            route: "/"
        }));

        return res.status(200).json({
            message: "shop status updated",
            shop
        });
    } catch (error) {
        return res.status(500).json({ message: `update managed shop status error ${error}` });
    }
};

export const getDeliveryManagement = async (req, res) => {
    try {
        const deliveryBoys = await User.find({ role: "deliveryBoy" })
            .select("-password -resetOtp -otpExpires -isOtpVerified")
            .sort({ createdAt: -1 });

        const [assignmentAgg, deliveredAgg] = await Promise.all([
            DeliveryAssignment.aggregate([
                {
                    $group: {
                        _id: "$assignedTo",
                        assigned: {
                            $sum: {
                                $cond: [{ $eq: ["$status", "assigned"] }, 1, 0]
                            }
                        },
                        brodcasted: {
                            $sum: {
                                $cond: [{ $eq: ["$status", "brodcasted"] }, 1, 0]
                            }
                        },
                        completed: {
                            $sum: {
                                $cond: [{ $eq: ["$status", "completed"] }, 1, 0]
                            }
                        }
                    }
                }
            ]),
            Order.aggregate([
                { $unwind: "$shopOrders" },
                {
                    $match: {
                        "shopOrders.assignedDeliveryBoy": { $ne: null },
                        "shopOrders.status": "delivered"
                    }
                },
                {
                    $group: {
                        _id: "$shopOrders.assignedDeliveryBoy",
                        deliveredOrders: { $sum: 1 },
                        deliveredValue: { $sum: "$shopOrders.subtotal" }
                    }
                }
            ])
        ]);

        const assignmentMap = new Map(assignmentAgg.map((entry) => [String(entry._id), entry]));
        const deliveredMap = new Map(deliveredAgg.map((entry) => [String(entry._id), entry]));

        const response = deliveryBoys.map((deliveryBoy) => {
            const assignment = assignmentMap.get(String(deliveryBoy._id)) || {};
            const delivered = deliveredMap.get(String(deliveryBoy._id)) || {};
            return {
                ...deliveryBoy.toObject(),
                stats: {
                    assigned: Number(assignment.assigned || 0),
                    brodcasted: Number(assignment.brodcasted || 0),
                    completed: Number(assignment.completed || 0),
                    deliveredOrders: Number(delivered.deliveredOrders || 0),
                    deliveredValue: Number(delivered.deliveredValue || 0)
                }
            };
        });

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ message: `get delivery management error ${error}` });
    }
};

export const getDisputes = async (req, res) => {
    try {
        const { status = "" } = req.query;
        const { page, limit, skip } = parsePagination(req.query);
        const query = {};
        if (status) {
            query.status = status;
        }

        const [total, disputes] = await Promise.all([
            Dispute.countDocuments(query),
            Dispute.find(query)
                .populate("raisedBy", "fullName role email mobile")
                .populate("resolvedBy", "fullName role")
                .populate("order", "_id createdAt deliveryAddress user shopOrders")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
        ]);

        return res.status(200).json({
            disputes,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return res.status(500).json({ message: `get disputes error ${error}` });
    }
};

export const updateDisputeStatus = async (req, res) => {
    try {
        const { disputeId } = req.params;
        const { status, resolutionNote = "" } = req.body;
        if (!["in_review", "resolved", "rejected"].includes(status)) {
            return res.status(400).json({ message: "invalid dispute status" });
        }
        if ((status === "resolved" || status === "rejected") && String(resolutionNote).trim().length < 3) {
            return res.status(400).json({ message: "resolution note is required" });
        }

        const dispute = await Dispute.findById(disputeId).populate("raisedBy", "socketId fullName");
        if (!dispute) {
            return res.status(400).json({ message: "dispute not found" });
        }

        dispute.status = status;
        if (status === "resolved" || status === "rejected") {
            dispute.resolutionNote = String(resolutionNote || "").trim();
            dispute.resolvedBy = req.userId;
            dispute.resolvedAt = new Date();
        }
        await dispute.save();
        await dispute.populate("resolvedBy", "fullName role");

        const io = req.app.get("io");
        emitNotification(io, dispute?.raisedBy?.socketId, buildNotification({
            type: "dispute_update",
            title: "Dispute status updated",
            message: `Your dispute is now ${status.replace("_", " ")}.`,
            route: "/my-orders"
        }));

        return res.status(200).json({
            message: "dispute status updated",
            dispute
        });
    } catch (error) {
        return res.status(500).json({ message: `update dispute status error ${error}` });
    }
};
