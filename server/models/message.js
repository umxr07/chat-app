const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        // =====================================================
        // CUSTOM MESSAGE ID
        // =====================================================

        id: {
            type: String,
            required: true,
            unique: true,
            default: () =>
                Date.now().toString() +
                Math.random()
                    .toString(36)
                    .substring(2)
        },

        // =====================================================
        // GROUP
        // =====================================================

        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group",
            required: true
        },

        // =====================================================
        // USERNAME
        // =====================================================

        username: {
            type: String,
            required: true,
            trim: true
        },

        // =====================================================
        // MESSAGE TEXT
        // =====================================================

        text: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500
        },

        // =====================================================
        // TIME
        // =====================================================

        time: {
            type: String,
            required: true
        },

        // =====================================================
        // REPLY
        // =====================================================

        replyTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            default: null
        },

        // =====================================================
        // DELETED
        // =====================================================

        deleted: {
            type: Boolean,
            default: false
        },

        // =====================================================
        // REACTION
        // =====================================================

        reaction: {
            type: String,
            default: null
        },

        reactionUser: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// =========================================================
// EXPORT
// =========================================================

module.exports = mongoose.model(
    "Message",
    messageSchema
);