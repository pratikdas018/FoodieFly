import express from "express";
import isAuth from "../middlewares/isAuth.js";
import isAdmin from "../middlewares/isAdmin.js";
import {
    getAdminOverview,
    getDeliveryManagement,
    getDisputes,
    getManagedShops,
    getManagedUsers,
    updateDisputeStatus,
    updateManagedShopStatus,
    updateManagedUserRole,
    updateManagedUserStatus
} from "../controllers/admin.controllers.js";

const adminRouter = express.Router();

adminRouter.use(isAuth, isAdmin);

adminRouter.get("/overview", getAdminOverview);
adminRouter.get("/users", getManagedUsers);
adminRouter.patch("/users/:userId/status", updateManagedUserStatus);
adminRouter.patch("/users/:userId/role", updateManagedUserRole);

adminRouter.get("/shops", getManagedShops);
adminRouter.patch("/shops/:shopId/status", updateManagedShopStatus);

adminRouter.get("/delivery", getDeliveryManagement);

adminRouter.get("/disputes", getDisputes);
adminRouter.patch("/disputes/:disputeId/status", updateDisputeStatus);

export default adminRouter;
