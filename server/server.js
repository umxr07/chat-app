require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const crypto = require("crypto");

const Group = require("./models/group");
const Message = require("./models/message");

// =========================================================
// APP
// =========================================================

const app = express();

// =========================================================
// EXPRESS
// =========================================================

app.use(
    cors({
        origin: true,
        credentials: true
    })
);

app.use(express.json());

// =========================================================
// MONGODB
// =========================================================

console.log(
    "MONGO_URI exists:",
    !!process.env.MONGO_URI
);

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log(
            "MongoDB connected successfully!"
        );
    })
    .catch((error) => {
        console.error(
            "MongoDB connection failed:",
            error
        );
    });

// =========================================================
// HTTP SERVER
// =========================================================

const server = http.createServer(app);

// =========================================================
// SOCKET.IO
// =========================================================

const io = new Server(server, {
    cors: {
        origin: true,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// =========================================================
// BASIC ROUTE
// =========================================================

app.get("/", (req, res) => {
    res.send("Chat app server is running!");
});

// =========================================================
// DATA
// =========================================================

let onlineUsers = 0;

// =========================================================
// GENERATE MESSAGE ID
// =========================================================

function generateMessageId() {
    return crypto.randomUUID();
}

// =========================================================
// GENERATE UNIQUE GROUP CODE
// =========================================================

async function generateGroupCode() {
    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let groupCode;
    let existingGroup;

    do {
        groupCode = "";

        for (let i = 0; i < 6; i++) {
            groupCode += characters.charAt(
                Math.floor(
                    Math.random() * characters.length
                )
            );
        }

        existingGroup = await Group.findOne({
            groupCode: groupCode
        });

    } while (existingGroup);

    return groupCode;
}

// =========================================================
// SOCKET CONNECTION
// =========================================================

io.on("connection", (socket) => {

    onlineUsers++;

    console.log("=================================");
    console.log("USER CONNECTED:", socket.id);
    console.log("Online users:", onlineUsers);
    console.log("=================================");

    io.emit(
        "online_users",
        onlineUsers
    );

    // =====================================================
    // USER JOINS CHAT
    // =====================================================

    socket.on(
        "join_chat",
        (username) => {

            if (
                !username ||
                typeof username !== "string"
            ) {
                return;
            }

            const cleanUsername =
                username.trim();

            if (cleanUsername === "") {
                return;
            }

            // -------------------------------------------------
            // CHECK DUPLICATE USERNAME
            // -------------------------------------------------

            const usernameTaken =
                Array.from(
                    io.sockets.sockets.values()
                ).some(
                    (connectedSocket) => {

                        return (
                            connectedSocket !== socket &&
                            connectedSocket.username &&
                            connectedSocket.username
                                .toLowerCase() ===
                            cleanUsername.toLowerCase()
                        );
                    }
                );

            if (usernameTaken) {

                console.log(
                    `Username "${cleanUsername}" is already taken`
                );

                socket.emit(
                    "username_taken"
                );

                return;
            }

            // -------------------------------------------------
            // ACCEPT USERNAME
            // -------------------------------------------------

            socket.username =
                cleanUsername;

            console.log(
                `${cleanUsername} joined the chat`
            );

            socket.emit(
                "username_accepted",
                cleanUsername
            );
        }
    );

    // =====================================================
    // GET GROUPS
    // =====================================================

    socket.on(
        "get_groups",
        async () => {

            try {

                if (!socket.username) {

                    console.log(
                        "GET GROUPS FAILED: No username"
                    );

                    return;
                }

                const dbGroups =
                    await Group
                        .find({})
                        .sort({
                            createdAt: 1
                        });

                const groups =
                    dbGroups.map(
                        formatGroup
                    );

                console.log(
                    `Sending ${groups.length} groups to ${socket.username}`
                );

                socket.emit(
                    "groups_list",
                    groups
                );

            } catch (error) {

                console.error(
                    "Error getting groups:",
                    error
                );

                socket.emit(
                    "group_error",
                    "Could not load groups"
                );
            }
        }
    );

    // =====================================================
    // CREATE GROUP
    // =====================================================

    socket.on(
        "create_group",
        async (data) => {

            try {

                console.log(
                    "================================="
                );

                console.log(
                    "CREATE GROUP REQUEST"
                );

                console.log(
                    "Data:",
                    data
                );

                console.log(
                    "Username:",
                    socket.username
                );

                // -------------------------------------------------
                // USERNAME CHECK
                // -------------------------------------------------

                if (!socket.username) {

                    socket.emit(
                        "group_error",
                        "Please join the chat first"
                    );

                    return;
                }

                // -------------------------------------------------
                // GET GROUP NAME
                // -------------------------------------------------

                let groupName = "";

                if (
                    typeof data === "string"
                ) {

                    groupName =
                        data.trim();

                } else if (
                    data &&
                    typeof data.name === "string"
                ) {

                    groupName =
                        data.name.trim();
                }

                // -------------------------------------------------
                // VALIDATE NAME
                // -------------------------------------------------

                if (groupName === "") {

                    socket.emit(
                        "group_error",
                        "Please enter a group name"
                    );

                    return;
                }

                if (groupName.length < 2) {

                    socket.emit(
                        "group_error",
                        "Group name must be at least 2 characters"
                    );

                    return;
                }

                if (groupName.length > 50) {

                    socket.emit(
                        "group_error",
                        "Group name cannot be longer than 50 characters"
                    );

                    return;
                }

                // -------------------------------------------------
                // CHECK DUPLICATE
                // -------------------------------------------------

                const existingGroup =
                    await Group.findOne({
                        name: {
                            $regex:
                                `^${escapeRegex(groupName)}$`,
                            $options: "i"
                        }
                    });

                if (existingGroup) {

                    socket.emit(
                        "group_error",
                        "A group with this name already exists"
                    );

                    return;
                }

                // -------------------------------------------------
                // GENERATE GROUP CODE
                // -------------------------------------------------

                const groupCode =
                    await generateGroupCode();

                console.log(
                    "Generated group code:",
                    groupCode
                );

                // -------------------------------------------------
                // CREATE GROUP
                // -------------------------------------------------

                const newGroup =
                    await Group.create({

                        name: groupName,

                        creator:
                            socket.username,

                        members: [],

                        groupCode:
                            groupCode
                    });

                console.log(
                    "Group created:",
                    newGroup.name
                );

                console.log(
                    "Group ID:",
                    newGroup._id.toString()
                );

                console.log(
                    "Group Code:",
                    newGroup.groupCode
                );

                // -------------------------------------------------
                // AUTOMATICALLY JOIN CREATOR
                // -------------------------------------------------

                await joinGroup(
                    socket,
                    newGroup._id.toString()
                );

                console.log(
                    "Creator automatically joined group"
                );

                // -------------------------------------------------
                // UPDATE GROUP LIST
                // -------------------------------------------------

                await emitGroups();

                console.log(
                    "================================="
                );

            } catch (error) {

                console.error(
                    "Create group error:",
                    error
                );

                if (error.code === 11000) {

                    socket.emit(
                        "group_error",
                        "A group with this name or code already exists"
                    );

                } else {

                    socket.emit(
                        "group_error",
                        "Could not create group"
                    );
                }
            }
        }
    );

    // =====================================================
    // JOIN GROUP
    // =====================================================
    socket.on(
        "join_group",
        async (groupIdOrCode) => {
            try {
                console.log(
                    "================================="
                );

                console.log(
                    "JOIN GROUP REQUEST"
                );

                console.log(
                    "Socket:",
                    socket.id
                );

                console.log(
                    "Username:",
                    socket.username
                );

                console.log(
                    "Group ID / Code:",
                    groupIdOrCode
                );

                console.log(
                    "================================="
                );

                if (!socket.username) {
                    socket.emit(
                        "group_error",
                        "Please join the chat first"
                    );
                    return;
                }

                if (
                    !groupIdOrCode ||
                    typeof groupIdOrCode !== "string"
                ) {
                    socket.emit(
                        "group_error",
                        "Invalid group ID or code"
                    );
                    return;
                }

                const value =
                    groupIdOrCode.trim();

                if (value === "") {
                    socket.emit(
                        "group_error",
                        "Please enter a group ID or code"
                    );
                    return;
                }

                // =================================================
                // TRY MONGODB GROUP ID FIRST
                // =================================================

                if (
                    mongoose.Types.ObjectId.isValid(value)
                ) {
                    const group =
                        await Group.findById(value);

                    if (group) {
                        await joinGroup(
                            socket,
                            group._id.toString()
                        );
                        return;
                    }
                }

                // =================================================
                // TRY GROUP CODE
                // =================================================

                const cleanGroupCode =
                    value.toUpperCase();

                const group =
                    await Group.findOne({
                        groupCode: cleanGroupCode
                    });

                if (group) {
                    await joinGroup(
                        socket,
                        group._id.toString()
                    );
                    return;
                }

                // =================================================
                // NOTHING FOUND
                // =================================================

                socket.emit(
                    "group_error",
                    "Invalid group ID or code"
                );

            } catch (error) {
                console.error(
                    "Join group error:",
                    error
                );

                socket.emit(
                    "group_error",
                    "Could not join group"
                );
            }
        }
    );

    // =====================================================
    // JOIN GROUP BY CODE
    // =====================================================

    socket.on(
        "join_group_by_code",
        async (groupCode) => {

            try {

                if (!socket.username) {

                    socket.emit(
                        "group_error",
                        "Please join the chat first"
                    );

                    return;
                }

                if (
                    !groupCode ||
                    typeof groupCode !== "string"
                ) {

                    socket.emit(
                        "group_error",
                        "Please enter a group code"
                    );

                    return;
                }

                const cleanGroupCode =
                    groupCode
                        .trim()
                        .toUpperCase();

                if (cleanGroupCode === "") {

                    socket.emit(
                        "group_error",
                        "Please enter a group code"
                    );

                    return;
                }

                const group =
                    await Group.findOne({
                        groupCode:
                            cleanGroupCode
                    });

                if (!group) {

                    socket.emit(
                        "group_error",
                        "Invalid group code"
                    );

                    return;
                }

                await joinGroup(
                    socket,
                    group._id.toString()
                );

            } catch (error) {

                console.error(
                    "Join group by code error:",
                    error
                );

                socket.emit(
                    "group_error",
                    "Could not join group"
                );
            }
        }
    );

    // =====================================================
    // DELETE GROUP
    // =====================================================

    socket.on(
        "delete_group",
        async (groupId) => {

            try {

                if (
                    !groupId ||
                    !socket.username
                ) {
                    return;
                }

                const group =
                    await Group.findById(
                        groupId
                    );

                if (!group) {

                    socket.emit(
                        "group_error",
                        "Group not found"
                    );

                    return;
                }

                // -------------------------------------------------
                // ONLY CREATOR CAN DELETE
                // -------------------------------------------------

                if (
                    group.creator !==
                    socket.username
                ) {

                    socket.emit(
                        "group_error",
                        "Only the group creator can delete this group"
                    );

                    return;
                }

                // -------------------------------------------------
                // DELETE ALL MESSAGES
                // -------------------------------------------------

                await Message.deleteMany({
                    groupId: group._id
                });

                // -------------------------------------------------
                // GET ROOM MEMBERS BEFORE DELETE
                // -------------------------------------------------

                const room =
                    io.sockets.adapter.rooms.get(
                        String(group._id)
                    );

                // -------------------------------------------------
                // DELETE GROUP
                // -------------------------------------------------

                await Group.findByIdAndDelete(
                    group._id
                );

                console.log(
                    `Group "${group.name}" deleted by ${socket.username}`
                );

                // -------------------------------------------------
                // REMOVE EVERYONE FROM ROOM
                // -------------------------------------------------

                if (room) {

                    for (
                        const socketId of room
                    ) {

                        const memberSocket =
                            io.sockets.sockets.get(
                                socketId
                            );

                        if (memberSocket) {

                            memberSocket.leave(
                                String(group._id)
                            );

                            memberSocket.currentGroup =
                                null;

                            memberSocket.emit(
                                "group_deleted"
                            );
                        }
                    }
                }

                // -------------------------------------------------
                // UPDATE GROUP LIST
                // -------------------------------------------------

                await emitGroups();

            } catch (error) {

                console.error(
                    "Delete group error:",
                    error
                );

                socket.emit(
                    "group_error",
                    "Could not delete group"
                );
            }
        }
    );

    // =====================================================
    // LEAVE GROUP
    // =====================================================

    socket.on(
        "leave_group",
        async () => {

            try {

                if (
                    !socket.currentGroup ||
                    !socket.username
                ) {
                    return;
                }

                const groupId =
                    socket.currentGroup;

                const group =
                    await Group.findById(
                        groupId
                    );

                if (group) {

                    group.members =
                        group.members.filter(
                            (member) =>
                                member !==
                                socket.username
                        );

                    await group.save();

                    socket
                        .to(groupId)
                        .emit(
                            "user_left",
                            {
                                username:
                                    socket.username
                            }
                        );
                }

                socket.leave(
                    groupId
                );

                socket.currentGroup =
                    null;

                await emitGroups();

                emitGroupOnlineUsers(
                    groupId
                );

            } catch (error) {

                console.error(
                    "Leave group error:",
                    error
                );
            }
        }
    );

    // =====================================================
    // TYPING
    // =====================================================

    socket.on(
        "typing",
        (username) => {

            if (!socket.currentGroup) {
                return;
            }

            socket
                .to(socket.currentGroup)
                .emit(
                    "user_typing",
                    {
                        username
                    }
                );
        }
    );

    // =====================================================
    // STOP TYPING
    // =====================================================

    socket.on(
        "stop_typing",
        () => {

            if (!socket.currentGroup) {
                return;
            }

            socket
                .to(socket.currentGroup)
                .emit(
                    "user_stop_typing"
                );
        }
    );

    // =====================================================
    // SEND MESSAGE
    // =====================================================

    socket.on(
        "send_message",
        async (data) => {

            try {

                if (
                    !data ||
                    !socket.currentGroup ||
                    !socket.username
                ) {
                    return;
                }

                if (
                    typeof data.text !== "string"
                ) {
                    return;
                }

                const cleanText =
                    data.text.trim();

                if (cleanText === "") {
                    return;
                }

                if (cleanText.length > 500) {

                    socket.emit(
                        "message_too_long"
                    );

                    return;
                }

                const group =
                    await Group.findById(
                        socket.currentGroup
                    );

                if (!group) {
                    return;
                }

                // -------------------------------------------------
                // REPLY
                // -------------------------------------------------

                let replyTo = null;

                if (data.replyTo) {

                    const replyId =
                        typeof data.replyTo === "object"
                            ? data.replyTo.id
                            : data.replyTo;

                    if (replyId) {

                        let replyMessage =
                            await Message.findOne({
                                id:
                                    String(replyId),
                                groupId:
                                    socket.currentGroup
                            });

                        if (
                            !replyMessage &&
                            mongoose.Types.ObjectId.isValid(
                                String(replyId)
                            )
                        ) {

                            replyMessage =
                                await Message.findOne({
                                    _id:
                                        String(replyId),
                                    groupId:
                                        socket.currentGroup
                                });
                        }

                        if (replyMessage) {

                            replyTo =
                                replyMessage._id;
                        }
                    }
                }

                // -------------------------------------------------
                // CREATE MESSAGE
                // -------------------------------------------------

                const newMessage =
                    await Message.create({

                        // IMPORTANT:
                        // Server generates the message ID
                        id:
                            generateMessageId(),

                        groupId:
                            group._id,

                        username:
                            socket.username,

                        text:
                            cleanText,

                        time:
                            data.time ||
                            new Date().toLocaleTimeString(
                                [],
                                {
                                    hour: "2-digit",
                                    minute: "2-digit"
                                }
                            ),

                        replyTo,

                        deleted: false,

                        reaction: null,

                        reactionUser: null
                    });

                // -------------------------------------------------
                // POPULATE REPLY
                // -------------------------------------------------

                await newMessage.populate({
                    path: "replyTo",
                    select:
                        "id username text deleted"
                });

                // -------------------------------------------------
                // FORMAT MESSAGE
                // -------------------------------------------------

                const formattedMessage =
                    formatMessage(
                        newMessage
                    );

                // -------------------------------------------------
                // SEND TO GROUP
                // -------------------------------------------------

                io
                    .to(socket.currentGroup)
                    .emit(
                        "receive_message",
                        formattedMessage
                    );

            } catch (error) {

                console.error(
                    "Send message error:",
                    error
                );
            }
        }
    );

    // =====================================================
    // GET GROUP MESSAGE HISTORY
    // =====================================================

    socket.on(
        "get_group_messages",
        async (groupId) => {

            try {

                if (
                    !socket.username ||
                    !groupId
                ) {
                    return;
                }

                if (
                    !mongoose.Types.ObjectId.isValid(
                        String(groupId)
                    )
                ) {
                    return;
                }

                const group =
                    await Group.findById(
                        groupId
                    );

                if (!group) {
                    return;
                }

                const dbMessages =
                    await Message
                        .find({
                            groupId:
                                group._id
                        })
                        .populate({
                            path:
                                "replyTo",
                            select:
                                "id username text deleted"
                        })
                        .sort({
                            createdAt: 1
                        });

                const groupMessages =
                    dbMessages.map(
                        formatMessage
                    );

                socket.emit(
                    "group_messages",
                    groupMessages
                );

            } catch (error) {

                console.error(
                    "Get group messages error:",
                    error
                );
            }
        }
    );

    // =====================================================
    // DELETE MESSAGE
    // =====================================================

    socket.on(
        "delete_message",
        async (data) => {

            try {

                if (
                    !data ||
                    !data.id ||
                    !socket.username ||
                    !socket.currentGroup
                ) {
                    return;
                }

                const messageId =
                    String(data.id);

                // -------------------------------------------------
                // FIND BY CUSTOM ID
                // -------------------------------------------------

                let message =
                    await Message.findOne({
                        id: messageId,
                        groupId:
                            socket.currentGroup
                    });

                // -------------------------------------------------
                // FALLBACK TO MONGODB _id
                // -------------------------------------------------

                if (
                    !message &&
                    mongoose.Types.ObjectId.isValid(
                        messageId
                    )
                ) {

                    message =
                        await Message.findOne({
                            _id: messageId,
                            groupId:
                                socket.currentGroup
                        });
                }

                if (!message) {

                    console.log(
                        "MESSAGE NOT FOUND FOR DELETE:",
                        messageId
                    );

                    return;
                }

                // -------------------------------------------------
                // ONLY MESSAGE OWNER CAN DELETE
                // -------------------------------------------------

                if (
                    message.username !==
                    socket.username
                ) {
                    return;
                }

                if (message.deleted) {
                    return;
                }

                // -------------------------------------------------
                // SOFT DELETE
                // -------------------------------------------------

                message.deleted = true;

                message.reaction = null;

                message.reactionUser = null;

                await message.save();

                console.log(
                    `Message ${message.id} deleted by ${socket.username}`
                );

                // -------------------------------------------------
                // NOTIFY GROUP
                // -------------------------------------------------

                io
                    .to(socket.currentGroup)
                    .emit(
                        "message_deleted",
                        {
                            id:
                                message.id,

                            _id:
                                message._id.toString()
                        }
                    );

            } catch (error) {

                console.error(
                    "Delete message error:",
                    error
                );
            }
        }
    );

    // =====================================================
    // ADD / CHANGE REACTION
    // =====================================================

    socket.on(
        "add_reaction",
        async (data) => {

            try {

                if (
                    !data ||
                    !data.id ||
                    !data.reaction ||
                    !socket.username ||
                    !socket.currentGroup
                ) {
                    return;
                }

                let message =
                    await Message.findOne({
                        id:
                            String(data.id),
                        groupId:
                            socket.currentGroup
                    });

                if (
                    !message &&
                    mongoose.Types.ObjectId.isValid(
                        String(data.id)
                    )
                ) {

                    message =
                        await Message.findOne({
                            _id:
                                String(data.id),
                            groupId:
                                socket.currentGroup
                        });
                }

                if (
                    !message ||
                    message.deleted
                ) {
                    return;
                }

                message.reaction =
                    data.reaction;

                message.reactionUser =
                    socket.username;

                await message.save();

                io
                    .to(socket.currentGroup)
                    .emit(
                        "message_reaction",
                        {
                            id:
                                message.id,

                            _id:
                                message._id.toString(),

                            reaction:
                                message.reaction,

                            username:
                                message.reactionUser
                        }
                    );

            } catch (error) {

                console.error(
                    "Add reaction error:",
                    error
                );
            }
        }
    );

    // =====================================================
    // REMOVE REACTION
    // =====================================================

    socket.on(
        "remove_reaction",
        async (data) => {

            try {

                if (
                    !data ||
                    !data.id ||
                    !socket.username ||
                    !socket.currentGroup
                ) {
                    return;
                }

                let message =
                    await Message.findOne({
                        id:
                            String(data.id),
                        groupId:
                            socket.currentGroup
                    });

                if (
                    !message &&
                    mongoose.Types.ObjectId.isValid(
                        String(data.id)
                    )
                ) {

                    message =
                        await Message.findOne({
                            _id:
                                String(data.id),
                            groupId:
                                socket.currentGroup
                        });
                }

                if (!message) {
                    return;
                }

                // -------------------------------------------------
                // ONLY PERSON WHO REACTED CAN REMOVE
                // -------------------------------------------------

                if (
                    message.reactionUser !==
                    socket.username
                ) {
                    return;
                }

                message.reaction = null;

                message.reactionUser = null;

                await message.save();

                io
                    .to(socket.currentGroup)
                    .emit(
                        "message_reaction_removed",
                        {
                            id:
                                message.id,

                            _id:
                                message._id.toString(),

                            username:
                                socket.username
                        }
                    );

            } catch (error) {

                console.error(
                    "Remove reaction error:",
                    error
                );
            }
        }
    );

    // =====================================================
    // DISCONNECT
    // =====================================================

    socket.on(
        "disconnect",
        async () => {

            try {

                if (
                    socket.currentGroup &&
                    socket.username
                ) {

                    const groupId =
                        socket.currentGroup;

                    const group =
                        await Group.findById(
                            groupId
                        );

                    if (group) {

                        group.members =
                            group.members.filter(
                                (member) =>
                                    member !==
                                    socket.username
                            );

                        await group.save();

                        socket
                            .to(groupId)
                            .emit(
                                "user_left",
                                {
                                    username:
                                        socket.username
                                }
                            );

                        emitGroupOnlineUsers(
                            groupId
                        );

                        await emitGroups();
                    }
                }

            } catch (error) {

                console.error(
                    "Disconnect group update error:",
                    error
                );
            }

            onlineUsers--;

            if (onlineUsers < 0) {
                onlineUsers = 0;
            }

            io.emit(
                "online_users",
                onlineUsers
            );

            console.log(
                "USER DISCONNECTED:",
                socket.id
            );
        }
    );
});

// =========================================================
// JOIN GROUP FUNCTION
// =========================================================

async function joinGroup(
    socket,
    groupId
) {

    try {

        if (!socket.username) {

            socket.emit(
                "group_error",
                "Please join the chat first"
            );

            return;
        }

        if (!groupId) {

            socket.emit(
                "group_error",
                "Invalid group"
            );

            return;
        }

        const groupIdString =
            String(groupId);

        if (
            !mongoose.Types.ObjectId.isValid(
                groupIdString
            )
        ) {

            socket.emit(
                "group_error",
                "Invalid group ID"
            );

            return;
        }

        const group =
            await Group.findById(
                groupIdString
            );

        if (!group) {

            socket.emit(
                "group_error",
                "Group not found"
            );

            return;
        }

        // -------------------------------------------------
        // LEAVE PREVIOUS GROUP
        // -------------------------------------------------

        if (
            socket.currentGroup &&
            socket.currentGroup !==
            groupIdString
        ) {

            const previousGroupId =
                String(
                    socket.currentGroup
                );

            socket.leave(
                previousGroupId
            );

            const previousGroup =
                await Group.findById(
                    previousGroupId
                );

            if (previousGroup) {

                previousGroup.members =
                    previousGroup.members.filter(
                        (member) =>
                            member !==
                            socket.username
                    );

                await previousGroup.save();

                socket
                    .to(previousGroupId)
                    .emit(
                        "user_left",
                        {
                            username:
                                socket.username
                        }
                    );

                emitGroupOnlineUsers(
                    previousGroupId
                );
            }
        }

        // -------------------------------------------------
        // JOIN SOCKET.IO ROOM
        // -------------------------------------------------

        socket.join(
            groupIdString
        );

        socket.currentGroup =
            groupIdString;

        // -------------------------------------------------
        // ADD MEMBER
        // -------------------------------------------------

        if (
            !group.members.includes(
                socket.username
            )
        ) {

            group.members.push(
                socket.username
            );

            await group.save();
        }

        // -------------------------------------------------
        // SEND GROUP JOINED
        // -------------------------------------------------

        const formattedGroup =
            formatGroup(group);

        socket.emit(
            "group_joined",
            formattedGroup
        );

        // -------------------------------------------------
        // LOAD HISTORY
        // -------------------------------------------------

        const dbMessages =
            await Message
                .find({
                    groupId:
                        group._id
                })
                .populate({
                    path:
                        "replyTo",
                    select:
                        "id username text deleted"
                })
                .sort({
                    createdAt: 1
                });

        const groupMessages =
            dbMessages.map(
                formatMessage
            );

        socket.emit(
            "group_messages",
            groupMessages
        );

        // -------------------------------------------------
        // NOTIFY OTHER USERS
        // -------------------------------------------------

        socket
            .to(groupIdString)
            .emit(
                "user_joined",
                {
                    username:
                        socket.username
                }
            );

        await emitGroups();

        emitGroupOnlineUsers(
            groupIdString
        );

    } catch (error) {

        console.error(
            "JOIN GROUP ERROR:",
            error
        );

        socket.emit(
            "group_error",
            "Could not join group"
        );
    }
}

// =========================================================
// SEND GROUP LIST
// =========================================================

async function emitGroups() {

    try {

        const dbGroups =
            await Group
                .find({})
                .sort({
                    createdAt: 1
                });

        const groups =
            dbGroups.map(
                formatGroup
            );

        io.emit(
            "groups_list",
            groups
        );

        console.log(
            `Group list updated: ${groups.length} groups`
        );

    } catch (error) {

        console.error(
            "Emit groups error:",
            error
        );
    }
}

// =========================================================
// GROUP ONLINE USERS
// =========================================================

function emitGroupOnlineUsers(
    groupId
) {

    if (!groupId) {
        return;
    }

    const socketsInRoom =
        io.sockets.adapter.rooms.get(
            groupId
        );

    const count =
        socketsInRoom
            ? socketsInRoom.size
            : 0;

    io
        .to(groupId)
        .emit(
            "group_online_users",
            count
        );
}

// =========================================================
// FORMAT GROUP
// =========================================================

function formatGroup(
    group
) {

    return {

        id:
            group._id.toString(),

        name:
            group.name,

        creator:
            group.creator,

        members:
            group.members || [],

        groupCode:
            group.groupCode
    };
}

// =========================================================
// FORMAT MESSAGE
// =========================================================

function formatMessage(
    message
) {

    return {

        // CUSTOM MESSAGE ID
        id:
            message.id,

        // MONGODB ID
        _id:
            message._id.toString(),

        groupId:
            message.groupId.toString(),

        username:
            message.username,

        text:
            message.text,

        time:
            message.time,

        replyTo:
            message.replyTo
                ? {
                    id:
                        message.replyTo._id
                            ? message.replyTo._id.toString()
                            : message.replyTo.id,

                    username:
                        message.replyTo.username ||
                        "",

                    text:
                        message.replyTo.text ||
                        "",

                    deleted:
                        message.replyTo.deleted ||
                        false
                }
                : null,

        deleted:
            message.deleted || false,

        reaction:
            message.reaction || null,

        reactionUser:
            message.reactionUser || null
    };
}

// =========================================================
// ESCAPE REGEX
// =========================================================

function escapeRegex(
    string
) {

    return string.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}

// =========================================================
// SERVER
// =========================================================

const PORT = process.env.PORT || 5000;

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Server running on http://localhost:${PORT}`
        );

        
    }
);