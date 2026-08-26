const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 50,
            unique: true
        },

        creator: {
            type: String,
            required: true,
            trim: true
        },

        members: {
            type: [String],
            default: []
        },

        groupCode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "Group",
    groupSchema
);