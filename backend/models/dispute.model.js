import mongoose from "mongoose";

const disputeSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true
    },
    shopOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    raisedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    raisedByRole: {
        type: String,
        enum: ["user", "owner", "deliveryBoy"],
        required: true
    },
    reason: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: "",
        trim: true
    },
    priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium"
    },
    status: {
        type: String,
        enum: ["open", "in_review", "resolved", "rejected"],
        default: "open"
    },
    resolutionNote: {
        type: String,
        default: "",
        trim: true
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    resolvedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

disputeSchema.index({ status: 1, createdAt: -1 });
disputeSchema.index({ order: 1, shopOrderId: 1 });

const Dispute = mongoose.model("Dispute", disputeSchema);
export default Dispute;
