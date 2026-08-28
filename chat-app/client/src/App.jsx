import {
    useEffect,
    useRef,
    useState
} from "react";

import {
    io
} from "socket.io-client";

import "./App.css";

// =====================================================
// SOCKET
// =====================================================

const socket = io("https://chatly-q2yn.onrender.com", {
    autoConnect: true
});

// =====================================================
// APP
// =====================================================

function App() {

    const [username, setUsername] =
        useState("");

    const [joined, setJoined] =
        useState(false);

    const [restoringSession, setRestoringSession] =
        useState(true);

    // =====================================================
    // GROUP STATES
    // =====================================================

    const [groups, setGroups] =
        useState([]);

    const [groupSearch, setGroupSearch] =
        useState("");

    const [groupName, setGroupName] =
        useState("");

    const [showCreateGroup, setShowCreateGroup] =
        useState(false);

    const [groupError, setGroupError] =
        useState("");

    const [currentGroup, setCurrentGroup] =
        useState(null);

    const [showMembers, setShowMembers] =
        useState(false);

    const [groupCode, setGroupCode] =
        useState("");

    const [showJoinGroup, setShowJoinGroup] =
        useState(false);

    const [showGroupInfo, setShowGroupInfo] =
        useState(false);

    const [groupIdCopied, setGroupIdCopied] =
        useState(false);

    // =====================================================
    // CHAT STATES
    // =====================================================

    const [message, setMessage] =
        useState("");

    const [messages, setMessages] =
        useState([]);

    const [showUsername, setShowUsername] =
        useState(true);

    const [showAnonymousNotice, setShowAnonymousNotice] =
        useState(true);

    const [onlineUsers, setOnlineUsers] =
        useState(0);

    const [groupOnlineUsers, setGroupOnlineUsers] =
        useState(0);

    const [typingUser, setTypingUser] =
        useState("");

    const [alertMessage, setAlertMessage] =
        useState("");

    const [copied, setCopied] =
        useState(false);

    const [deleteMessageIndex, setDeleteMessageIndex] =
        useState(null);

    const [swipedMessageIndex, setSwipedMessageIndex] =
        useState(null);

    const [replyingTo, setReplyingTo] =
        useState(null);

    const [swipeOffset, setSwipeOffset] =
        useState(0);

    const [activeSwipeIndex, setActiveSwipeIndex] =
        useState(null);

    // =====================================================
    // REFRESH STATES
    // =====================================================

    const [refreshing, setRefreshing] =
        useState(false);

    const [refreshDistance, setRefreshDistance] =
        useState(0);

    // =====================================================
    // REFS
    // =====================================================

    const messagesEndRef =
        useRef(null);

    const messagesContainerRef =
        useRef(null);

    const messageInputRef =
        useRef(null);

    const typingTimeoutRef =
        useRef(null);

    const swipeStartXRef =
        useRef(0);

    const swipeStartYRef =
        useRef(0);

    const swipeCurrentXRef =
        useRef(0);

    const isSwipingRef =
        useRef(false);

    const touchMovedRef =
        useRef(false);

    const longPressTimerRef =
        useRef(null);

    const longPressTriggeredRef =
        useRef(false);

    // =====================================================
    // PULL TO REFRESH REFS
    // =====================================================

    const refreshStartYRef =
        useRef(0);

    const refreshStartXRef =
        useRef(0);

    const refreshPullingRef =
        useRef(false);

    const refreshDistanceRef =
        useRef(0);

    const refreshAnimationFrameRef =
        useRef(null);

    // =====================================================
    // SAVE CURRENT GROUP
    // =====================================================

    function saveCurrentGroup(group) {

        if (!group?.id) {
            return;
        }

        localStorage.setItem(
            "chatly_current_group",
            JSON.stringify({
                id:
                    group.id,

                groupCode:
                    group.groupCode || ""
            })
        );
    }

    // =====================================================
    // CLEAR SAVED GROUP
    // =====================================================

    function clearSavedGroup() {

        localStorage.removeItem(
            "chatly_current_group"
        );
    }

    // =====================================================
    // CLOSE MESSAGE ACTIONS
    // =====================================================

    useEffect(() => {

        function handleDocumentClick(event) {

            if (
                event.target.closest(
                    ".message-actions"
                )
            ) {
                return;
            }

            if (
                event.target.closest(
                    ".message"
                )
            ) {
                return;
            }

            setDeleteMessageIndex(null);

            setSwipedMessageIndex(null);

            setActiveSwipeIndex(null);

            setSwipeOffset(0);
        }

        document.addEventListener(
            "click",
            handleDocumentClick,
            true
        );

        return () => {

            document.removeEventListener(
                "click",
                handleDocumentClick,
                true
            );
        };

    }, []);

    // =====================================================
    // SOCKET EVENTS
    // =====================================================

    useEffect(() => {

        // -------------------------------------------------
        // RECEIVE MESSAGE
        // -------------------------------------------------

        function handleReceiveMessage(data) {

            if (
                !currentGroup ||
                data.groupId !== currentGroup.id
            ) {
                return;
            }

            setMessages(previousMessages => {

                const alreadyExists =
                    previousMessages.some(
                        msg =>
                            msg.id &&
                            data.id &&
                            String(msg.id) ===
                            String(data.id)
                    );

                if (alreadyExists) {
                    return previousMessages;
                }

                const tempMessageIndex =
                    previousMessages.findIndex(
                        msg =>
                            msg.sending === true &&
                            msg.tempId &&
                            msg.username === data.username &&
                            msg.text === data.text &&
                            msg.groupId === data.groupId
                    );

                if (tempMessageIndex !== -1) {

                    return previousMessages.map(
                        (msg, index) =>
                            index === tempMessageIndex
                                ? {
                                    ...data,

                                    clientKey:
                                        msg.clientKey,

                                    tempId:
                                        undefined,

                                    sending:
                                        false,

                                    failed:
                                        false
                                }
                                : msg
                    );
                }

                return [
                    ...previousMessages,
                    {
                        ...data,

                        clientKey:
                            data.clientKey ||
                            String(data.id),

                        sending:
                            false,

                        failed:
                            false
                    }
                ];
            });
        }

        socket.on(
            "receive_message",
            handleReceiveMessage
        );

        // -------------------------------------------------
        // ONLINE USERS
        // -------------------------------------------------

        function handleOnlineUsers(count) {

            setOnlineUsers(count);
        }

        socket.on(
            "online_users",
            handleOnlineUsers
        );

        // -------------------------------------------------
        // GROUP ONLINE USERS
        // -------------------------------------------------

        function handleGroupOnlineUsers(count) {

            setGroupOnlineUsers(count);
        }

        socket.on(
            "group_online_users",
            handleGroupOnlineUsers
        );

        // -------------------------------------------------
        // GROUP LIST
        // -------------------------------------------------

        function handleGroupsList(groupList) {

            if (!Array.isArray(groupList)) {
                return;
            }

            console.log(
                "GROUP LIST RECEIVED:",
                groupList
            );

            setGroups(groupList);

            setCurrentGroup(previousGroup => {

                if (!previousGroup) {
                    return null;
                }

                const updatedGroup =
                    groupList.find(
                        group =>
                            group.id ===
                            previousGroup.id
                    );

                if (!updatedGroup) {
                    return previousGroup;
                }

                return updatedGroup;
            });
        }

        socket.on(
            "groups_list",
            handleGroupsList
        );

        // -------------------------------------------------
        // GROUP JOINED
        // -------------------------------------------------

        function handleGroupJoined(group) {

            console.log(
                "GROUP JOINED:",
                group
            );

            saveCurrentGroup(group);

            setCurrentGroup(group);

            setRestoringSession(false);

            setShowMembers(false);

            setShowGroupInfo(false);

            setGroupIdCopied(false);

            setGroupOnlineUsers(
                group.members?.length || 1
            );

            /*
             * IMPORTANT:
             * During refresh we DON'T clear messages here.
             * group_messages will replace them with fresh
             * messages from the server.
             */
            if (!refreshing) {
                setMessages([]);
            }

            setTypingUser("");

            setReplyingTo(null);

            setDeleteMessageIndex(null);

            setSwipedMessageIndex(null);

            setActiveSwipeIndex(null);

            setSwipeOffset(0);

            setGroupError("");

            /*
             * Don't stop refreshing here.
             * group_messages will stop it after the actual
             * messages arrive.
             */
        }

        socket.on(
            "group_joined",
            handleGroupJoined
        );

        // -------------------------------------------------
        // GROUP MESSAGES
        // -------------------------------------------------

        function handleGroupMessages(groupMessages) {

            if (!Array.isArray(groupMessages)) {
                return;
            }

            setMessages(
                groupMessages.map(msg => ({
                    ...msg,

                    clientKey:
                        msg.clientKey ||
                        String(msg.id),

                    sending:
                        false,

                    failed:
                        false
                }))
            );

            setTypingUser("");

            setReplyingTo(null);

            setDeleteMessageIndex(null);

            setSwipedMessageIndex(null);

            setActiveSwipeIndex(null);

            setSwipeOffset(0);

            /*
             * Refresh is considered complete only when
             * the server has actually sent the messages.
             */
            setRefreshing(false);

            setRefreshDistance(0);

            refreshDistanceRef.current =
                0;
        }

        socket.on(
            "group_messages",
            handleGroupMessages
        );

        // -------------------------------------------------
        // GROUP ERROR
        // -------------------------------------------------

        function handleGroupError(error) {

            console.error(
                "GROUP ERROR:",
                error
            );

            setGroupError(error);

            setRestoringSession(false);

            setRefreshing(false);

            setRefreshDistance(0);

            refreshDistanceRef.current =
                0;
        }

        socket.on(
            "group_error",
            handleGroupError
        );

        // -------------------------------------------------
        // SOCKET CONNECTION ERROR
        // -------------------------------------------------

        function handleSocketConnectionError(error) {

            console.error(
                "SOCKET CONNECTION ERROR:",
                error
            );

            setGroupError(
                "Could not connect to the chat server."
            );

            setRestoringSession(false);

            setRefreshing(false);

            setRefreshDistance(0);

            refreshDistanceRef.current =
                0;
        }

        socket.on(
            "connect_error",
            handleSocketConnectionError
        );

        // -------------------------------------------------
        // USER JOINED
        // -------------------------------------------------

        function handleUserJoined(data) {

            if (!data?.username) {
                return;
            }

            setMessages(
                previousMessages => [
                    ...previousMessages,
                    {
                        type: "system",

                        status: "joined",

                        text:
                            `${data.username} joined the chat`,

                        clientKey:
                            `system-joined-${Date.now()}-${Math.random()}`
                    }
                ]
            );
        }

        socket.on(
            "user_joined",
            handleUserJoined
        );

        // -------------------------------------------------
        // USER LEFT
        // -------------------------------------------------

        function handleUserLeft(data) {

            if (!data?.username) {
                return;
            }

            setMessages(
                previousMessages => [
                    ...previousMessages,
                    {
                        type: "system",

                        status: "left",

                        text:
                            `${data.username} left the chat`,

                        clientKey:
                            `system-left-${Date.now()}-${Math.random()}`
                    }
                ]
            );
        }

        socket.on(
            "user_left",
            handleUserLeft
        );

        // -------------------------------------------------
        // TYPING
        // -------------------------------------------------

        function handleUserTyping(data) {

            if (!data?.username) {
                return;
            }

            if (
                data.username ===
                username
            ) {
                return;
            }

            setTypingUser(
                data.username
            );
        }

        socket.on(
            "user_typing",
            handleUserTyping
        );

        // -------------------------------------------------
        // STOP TYPING
        // -------------------------------------------------

        function handleUserStopTyping() {

            setTypingUser("");
        }

        socket.on(
            "user_stop_typing",
            handleUserStopTyping
        );

        // -------------------------------------------------
        // USERNAME TAKEN
        // -------------------------------------------------

        function handleUsernameTaken() {

            localStorage.removeItem(
                "chatly_username"
            );

            setAlertMessage(
                "That username is already taken"
            );

            setJoined(false);

            setRestoringSession(false);
        }

        socket.on(
            "username_taken",
            handleUsernameTaken
        );

        // -------------------------------------------------
        // USERNAME ACCEPTED
        // -------------------------------------------------

        function handleUsernameAccepted(
            acceptedUsername
        ) {

            const finalUsername =
                acceptedUsername ||
                username;

            if (acceptedUsername) {

                setUsername(
                    acceptedUsername
                );
            }

            localStorage.setItem(
                "chatly_username",
                finalUsername
            );

            setAlertMessage("");

            setJoined(true);

            socket.emit(
                "get_groups"
            );

            // ---------------------------------------------
            // RESTORE PREVIOUS GROUP
            // ---------------------------------------------

            const savedGroup =
                localStorage.getItem(
                    "chatly_current_group"
                );

            if (!savedGroup) {

                setRestoringSession(false);

                return;
            }

            try {

                const parsedGroup =
                    JSON.parse(savedGroup);

                if (
                    parsedGroup &&
                    parsedGroup.id
                ) {

                    console.log(
                        "RESTORING PREVIOUS GROUP:",
                        parsedGroup.id
                    );

                    socket.emit(
                        "join_group",
                        String(
                            parsedGroup.id
                        )
                    );

                    return;
                }

                clearSavedGroup();

                setRestoringSession(false);

            } catch (error) {

                console.error(
                    "GROUP RESTORE ERROR:",
                    error
                );

                clearSavedGroup();

                setRestoringSession(false);
            }
        }

        socket.on(
            "username_accepted",
            handleUsernameAccepted
        );

        // -------------------------------------------------
        // MESSAGE DELETED
        // -------------------------------------------------

        function handleMessageDeleted(data) {

            if (!data?.id) {
                return;
            }

            setMessages(
                previousMessages =>
                    previousMessages.map(msg => {

                        if (
                            String(msg.id) ===
                            String(data.id)
                        ) {

                            return {
                                ...msg,

                                deleted:
                                    true,

                                text:
                                    "",

                                reaction:
                                    null,

                                reactionUser:
                                    null,

                                sending:
                                    false
                            };
                        }

                        return msg;
                    })
            );

            setDeleteMessageIndex(null);

            setSwipedMessageIndex(null);

            setActiveSwipeIndex(null);

            setSwipeOffset(0);
        }

        socket.on(
            "message_deleted",
            handleMessageDeleted
        );

        // -------------------------------------------------
        // MESSAGE REACTION
        // -------------------------------------------------

        function handleMessageReaction(data) {

            if (!data?.id) {
                return;
            }

            setMessages(
                previousMessages =>
                    previousMessages.map(msg =>
                        String(msg.id) ===
                            String(data.id)
                            ? {
                                ...msg,

                                reaction:
                                    data.reaction,

                                reactionUser:
                                    data.username,

                                sending:
                                    false
                            }
                            : msg
                    )
            );
        }

        socket.on(
            "message_reaction",
            handleMessageReaction
        );

        // -------------------------------------------------
        // REMOVE REACTION
        // -------------------------------------------------

        function handleMessageReactionRemoved(data) {

            if (!data?.id) {
                return;
            }

            setMessages(
                previousMessages =>
                    previousMessages.map(msg =>
                        String(msg.id) ===
                            String(data.id)
                            ? {
                                ...msg,

                                reaction:
                                    null,

                                reactionUser:
                                    null,

                                sending:
                                    false
                            }
                            : msg
                    )
            );
        }

        socket.on(
            "message_reaction_removed",
            handleMessageReactionRemoved
        );

        // -------------------------------------------------
        // MESSAGE TOO LONG
        // -------------------------------------------------

        function handleMessageTooLong() {

            setAlertMessage(
                "Message cannot be longer than 500 characters"
            );
        }

        socket.on(
            "message_too_long",
            handleMessageTooLong
        );

        // -------------------------------------------------
        // GROUP DELETED
        // -------------------------------------------------

        function handleGroupDeleted() {

            clearSavedGroup();

            setCurrentGroup(null);

            setShowMembers(false);

            setShowGroupInfo(false);

            setGroupIdCopied(false);

            setGroupOnlineUsers(0);

            setMessages([]);

            setTypingUser("");

            setReplyingTo(null);

            setDeleteMessageIndex(null);

            setSwipedMessageIndex(null);

            setActiveSwipeIndex(null);

            setSwipeOffset(0);

            setGroupError("");

            setRefreshing(false);

            setRefreshDistance(0);

            refreshDistanceRef.current =
                0;
        }

        socket.on(
            "group_deleted",
            handleGroupDeleted
        );

        // -------------------------------------------------
        // CLEANUP
        // -------------------------------------------------

        return () => {

            socket.off(
                "receive_message",
                handleReceiveMessage
            );

            socket.off(
                "online_users",
                handleOnlineUsers
            );

            socket.off(
                "group_online_users",
                handleGroupOnlineUsers
            );

            socket.off(
                "groups_list",
                handleGroupsList
            );

            socket.off(
                "group_joined",
                handleGroupJoined
            );

            socket.off(
                "group_messages",
                handleGroupMessages
            );

            socket.off(
                "group_error",
                handleGroupError
            );

            socket.off(
                "connect_error",
                handleSocketConnectionError
            );

            socket.off(
                "user_joined",
                handleUserJoined
            );

            socket.off(
                "user_left",
                handleUserLeft
            );

            socket.off(
                "user_typing",
                handleUserTyping
            );

            socket.off(
                "user_stop_typing",
                handleUserStopTyping
            );

            socket.off(
                "username_taken",
                handleUsernameTaken
            );

            socket.off(
                "username_accepted",
                handleUsernameAccepted
            );

            socket.off(
                "message_deleted",
                handleMessageDeleted
            );

            socket.off(
                "message_reaction",
                handleMessageReaction
            );

            socket.off(
                "message_reaction_removed",
                handleMessageReactionRemoved
            );

            socket.off(
                "message_too_long",
                handleMessageTooLong
            );

            socket.off(
                "group_deleted",
                handleGroupDeleted
            );
        };

    }, [
        currentGroup,
        username,
        refreshing
    ]);

    // =====================================================
    // RESTORE SESSION ON PAGE LOAD
    // =====================================================

    useEffect(() => {

        const savedUsername =
            localStorage.getItem(
                "chatly_username"
            );

        if (!savedUsername) {

            setRestoringSession(false);

            return;
        }

        setUsername(
            savedUsername
        );

        if (!socket.connected) {

            socket.connect();
        }

        const joinSavedUsername = () => {

            console.log(
                "RESTORING USERNAME:",
                savedUsername
            );

            socket.emit(
                "join_chat",
                savedUsername
            );
        };

        if (socket.connected) {

            joinSavedUsername();

        } else {

            socket.once(
                "connect",
                joinSavedUsername
            );
        }

        return () => {

            socket.off(
                "connect",
                joinSavedUsername
            );
        };

    }, []);

    // =====================================================
    // AUTO SCROLL
    // =====================================================

    useEffect(() => {

        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth"
        });

    }, [
        messages,
        typingUser
    ]);

    // =====================================================
    // CLEANUP
    // =====================================================

    useEffect(() => {

        return () => {

            clearTimeout(
                typingTimeoutRef.current
            );

            clearTimeout(
                longPressTimerRef.current
            );

            if (
                refreshAnimationFrameRef.current
            ) {

                cancelAnimationFrame(
                    refreshAnimationFrameRef.current
                );
            }
        };

    }, []);

    // =====================================================
    // PULL TO REFRESH FROM HEADER
    // =====================================================

    function handleRefreshTouchStart(event) {

        if (
            !currentGroup ||
            refreshing
        ) {
            return;
        }

        if (
            event.target.closest("button") ||
            event.target.closest("input") ||
            event.target.closest(".members-button") ||
            event.target.closest(".chat-group-title")
        ) {
            return;
        }

        const touch =
            event.touches[0];

        refreshStartYRef.current =
            touch.clientY;

        refreshStartXRef.current =
            touch.clientX;

        refreshPullingRef.current =
            true;

        refreshDistanceRef.current =
            0;

        setRefreshDistance(0);
    }

    function handleRefreshTouchMove(event) {

        if (
            !refreshPullingRef.current ||
            refreshing
        ) {
            return;
        }

        const touch =
            event.touches[0];

        const distance =
            touch.clientY -
            refreshStartYRef.current;

        const horizontalDistance =
            Math.abs(
                touch.clientX -
                refreshStartXRef.current
            );

        // ---------------------------------------------
        // UPWARD MOVEMENT
        // ---------------------------------------------

        if (
            distance <= 0
        ) {

            refreshDistanceRef.current =
                0;

            if (
                refreshAnimationFrameRef.current
            ) {

                cancelAnimationFrame(
                    refreshAnimationFrameRef.current
                );
            }

            setRefreshDistance(0);

            return;
        }

        // ---------------------------------------------
        // HORIZONTAL MOVEMENT
        // ---------------------------------------------

        if (
            horizontalDistance > distance
        ) {

            refreshPullingRef.current =
                false;

            refreshDistanceRef.current =
                0;

            setRefreshDistance(0);

            return;
        }

        /*
         * Resistance:
         *
         * Finger moves 100px
         * indicator moves approximately 100px
         *
         * Maximum = 100px
         */
        const limitedDistance =
            Math.min(
                distance,
                100
            );

        refreshDistanceRef.current =
            limitedDistance;

        /*
         * IMPORTANT:
         * Don't update React state for every single
         * touch event.
         *
         * requestAnimationFrame prevents mobile lag.
         */
        if (
            !refreshAnimationFrameRef.current
        ) {

            refreshAnimationFrameRef.current =
                requestAnimationFrame(() => {

                    setRefreshDistance(
                        refreshDistanceRef.current
                    );

                    refreshAnimationFrameRef.current =
                        null;
                });
        }

        /*
         * Prevent browser's native pull-to-refresh
         * once the user has actually started pulling.
         */
        if (
            distance > 8
        ) {

            event.preventDefault();
        }
    }

    function handleRefreshTouchEnd() {

        if (
            !refreshPullingRef.current ||
            refreshing
        ) {
            return;
        }

        const distance =
            refreshDistanceRef.current;

        refreshPullingRef.current =
            false;

        /*
         * If 70px reached, refresh.
         */
        if (
            distance >= 70
        ) {

            refreshCurrentGroup();

        } else {

            refreshDistanceRef.current =
                0;

            setRefreshDistance(0);
        }
    }

    // =====================================================
    // REFRESH CURRENT GROUP
    // =====================================================

    function refreshCurrentGroup() {

        if (
            !currentGroup ||
            refreshing
        ) {
            return;
        }

        console.log(
            "REFRESHING GROUP:",
            currentGroup.id
        );

        setRefreshing(true);

        /*
         * Keep indicator at 70px while refreshing.
         */
        setRefreshDistance(70);

        refreshDistanceRef.current =
            70;

        /*
         * IMPORTANT:
         *
         * DON'T clear messages here.
         *
         * Old messages stay visible while the new
         * messages are being fetched.
         *
         * This prevents the blank-chat problem.
         */

        setTypingUser("");

        setReplyingTo(null);

        setDeleteMessageIndex(null);

        setSwipedMessageIndex(null);

        setActiveSwipeIndex(null);

        setSwipeOffset(0);

        setGroupError("");

        // ---------------------------------------------
        // SOCKET CONNECTED
        // ---------------------------------------------

        if (
            socket.connected
        ) {

            socket.emit(
                "join_group",
                String(
                    currentGroup.id
                )
            );

            return;
        }

        // ---------------------------------------------
        // SOCKET DISCONNECTED
        // ---------------------------------------------

        console.log(
            "SOCKET DISCONNECTED. RECONNECTING..."
        );

        const handleRefreshReconnect = () => {

            console.log(
                "SOCKET RECONNECTED"
            );

            /*
             * Re-register username first.
             *
             * username_accepted will restore the group.
             */
            socket.emit(
                "join_chat",
                username
            );
        };

        socket.once(
            "connect",
            handleRefreshReconnect
        );

        socket.connect();
    }

    // =====================================================
    // TOUCH START
    // =====================================================

    function handleTouchStart(
        event,
        index,
        isDeleted
    ) {

        if (isDeleted) {
            return;
        }

        const touch =
            event.touches[0];

        swipeStartXRef.current =
            touch.clientX;

        swipeStartYRef.current =
            touch.clientY;

        swipeCurrentXRef.current =
            touch.clientX;

        isSwipingRef.current =
            false;

        touchMovedRef.current =
            false;

        longPressTriggeredRef.current =
            false;

        setActiveSwipeIndex(index);

        if (
            swipedMessageIndex === index
        ) {

            setSwipeOffset(70);

        } else {

            setSwipeOffset(0);
        }

        clearTimeout(
            longPressTimerRef.current
        );

        longPressTimerRef.current =
            setTimeout(() => {

                longPressTriggeredRef.current =
                    true;

                touchMovedRef.current =
                    false;

                setActiveSwipeIndex(index);

                setSwipeOffset(0);

                setSwipedMessageIndex(index);

                setDeleteMessageIndex(
                    messages[index]?.username ===
                        username
                        ? index
                        : null
                );

            }, 600);
    }

    // =====================================================
    // TOUCH MOVE
    // =====================================================

    function handleTouchMove(
        event,
        index
    ) {

        const touch =
            event.touches[0];

        swipeCurrentXRef.current =
            touch.clientX;

        const deltaX =
            touch.clientX -
            swipeStartXRef.current;

        const deltaY =
            touch.clientY -
            swipeStartYRef.current;

        if (
            Math.abs(deltaY) >
            Math.abs(deltaX)
        ) {

            clearTimeout(
                longPressTimerRef.current
            );

            isSwipingRef.current =
                false;

            return;
        }

        if (
            Math.abs(deltaX) < 12
        ) {
            return;
        }

        clearTimeout(
            longPressTimerRef.current
        );

        touchMovedRef.current =
            true;

        if (
            deltaX > 12
        ) {

            isSwipingRef.current =
                true;

            setActiveSwipeIndex(index);

            setSwipeOffset(
                Math.min(
                    deltaX,
                    70
                )
            );
        }
    }

    // =====================================================
    // TOUCH END
    // =====================================================

    function handleTouchEnd(
        selectedMessage,
        index
    ) {

        clearTimeout(
            longPressTimerRef.current
        );

        const deltaX =
            swipeCurrentXRef.current -
            swipeStartXRef.current;

        if (
            longPressTriggeredRef.current
        ) {

            setActiveSwipeIndex(index);

            setSwipeOffset(0);

            setSwipedMessageIndex(index);

            if (
                selectedMessage.username ===
                username
            ) {

                setDeleteMessageIndex(index);

            } else {

                setDeleteMessageIndex(null);
            }

            longPressTriggeredRef.current =
                false;

            isSwipingRef.current =
                false;

            touchMovedRef.current =
                false;

            return;
        }

        if (
            isSwipingRef.current &&
            deltaX >= 55
        ) {

            setActiveSwipeIndex(index);

            setSwipeOffset(70);

            setSwipedMessageIndex(index);

            setDeleteMessageIndex(null);

            handleReply(
                selectedMessage
            );

        } else if (
            !isSwipingRef.current
        ) {

            if (
                swipedMessageIndex !==
                index
            ) {

                setActiveSwipeIndex(null);

                setSwipeOffset(0);
            }

        } else {

            setActiveSwipeIndex(null);

            setSwipeOffset(0);
        }

        isSwipingRef.current =
            false;

        setTimeout(() => {

            touchMovedRef.current =
                false;

        }, 50);
    }

    // =====================================================
    // TOUCH CANCEL
    // =====================================================

    function handleTouchCancel() {

        clearTimeout(
            longPressTimerRef.current
        );

        longPressTriggeredRef.current =
            false;

        isSwipingRef.current =
            false;

        touchMovedRef.current =
            false;

        setActiveSwipeIndex(null);

        setSwipeOffset(0);
    }

    // =====================================================
    // ACTION TOUCH
    // =====================================================

    function handleActionTouchStart(event) {

        event.stopPropagation();

        clearTimeout(
            longPressTimerRef.current
        );

        isSwipingRef.current =
            false;

        touchMovedRef.current =
            false;

        longPressTriggeredRef.current =
            false;
    }

    function handleActionTouchMove(event) {

        event.stopPropagation();

        isSwipingRef.current =
            false;

        touchMovedRef.current =
            false;
    }

    function handleActionTouchEnd(event) {

        event.stopPropagation();

        clearTimeout(
            longPressTimerRef.current
        );

        isSwipingRef.current =
            false;

        touchMovedRef.current =
            false;

        longPressTriggeredRef.current =
            false;
    }

    // =====================================================
    // FOCUS INPUT
    // =====================================================

    function focusTypingArea() {

        setTimeout(() => {

            messageInputRef.current?.focus();

        }, 100);
    }

    // =====================================================
    // REPLY
    // =====================================================

    function handleReply(
        selectedMessage
    ) {

        if (
            !selectedMessage ||
            selectedMessage.deleted
        ) {
            return;
        }

        setReplyingTo({

            id:
                selectedMessage.id,

            username:
                selectedMessage.username,

            text:
                selectedMessage.text
        });

        setDeleteMessageIndex(null);

        setSwipedMessageIndex(null);

        setActiveSwipeIndex(null);

        setSwipeOffset(0);

        focusTypingArea();
    }

    // =====================================================
    // DELETE MESSAGE
    // =====================================================

    function handleDeleteMessage(
        selectedMessage
    ) {

        if (!selectedMessage) {
            return;
        }

        const messageId =
            selectedMessage.id;

        if (!messageId) {

            console.log(
                "DELETE FAILED: Message has no ID"
            );

            return;
        }

        if (
            selectedMessage.username !==
            username
        ) {

            console.log(
                "DELETE FAILED: Not your message"
            );

            return;
        }

        if (
            selectedMessage.deleted
        ) {
            return;
        }

        if (!currentGroup) {
            return;
        }

        socket.emit(
            "delete_message",
            {
                id:
                    String(messageId),

                groupId:
                    currentGroup.id
            }
        );

        setDeleteMessageIndex(null);

        setSwipedMessageIndex(null);

        setActiveSwipeIndex(null);

        setSwipeOffset(0);
    }

    // =====================================================
    // OPEN MESSAGE ACTIONS
    // =====================================================

    function openMessageActions(
        event,
        index,
        msg
    ) {

        event.preventDefault();

        event.stopPropagation();

        if (
            !msg ||
            msg.deleted
        ) {
            return;
        }

        const isMyMessage =
            msg.username ===
            username;

        setActiveSwipeIndex(index);

        setSwipeOffset(0);

        setSwipedMessageIndex(index);

        if (isMyMessage) {

            setDeleteMessageIndex(index);

        } else {

            setDeleteMessageIndex(null);
        }
    }

    // =====================================================
    // DELETE GROUP
    // =====================================================

    function handleDeleteGroup() {

        if (!currentGroup) {
            return;
        }

        if (
            currentGroup.creator !==
            username
        ) {
            return;
        }

        const confirmed =
            window.confirm(
                `Delete "${currentGroup.name}" permanently?`
            );

        if (!confirmed) {
            return;
        }

        socket.emit(
            "delete_group",
            currentGroup.id
        );
    }

    // =====================================================
    // COPY GROUP ID
    // =====================================================

    function handleCopyGroupId() {

        if (
            !currentGroup?.groupCode ||
            !navigator.clipboard
        ) {
            return;
        }

        navigator.clipboard
            .writeText(
                String(
                    currentGroup.groupCode
                )
            )
            .then(() => {

                setGroupIdCopied(true);

                setTimeout(() => {

                    setGroupIdCopied(false);

                }, 1500);

            })
            .catch(() => {

                setGroupIdCopied(false);

            });
    }

    // =====================================================
    // TOGGLE GROUP INFO
    // =====================================================

    function toggleGroupInfo() {

        setShowGroupInfo(
            previous =>
                !previous
        );

        setGroupIdCopied(false);
    }

    // =====================================================
    // LEAVE GROUP / GO TO GROUPS
    // =====================================================

    function handleLeaveGroup() {

        socket.emit(
            "leave_group"
        );

        clearSavedGroup();

        setCurrentGroup(null);

        setRestoringSession(false);

        setShowMembers(false);

        setShowGroupInfo(false);

        setGroupIdCopied(false);

        setGroupOnlineUsers(0);

        setMessages([]);

        setTypingUser("");

        setReplyingTo(null);

        setDeleteMessageIndex(null);

        setSwipedMessageIndex(null);

        setActiveSwipeIndex(null);

        setSwipeOffset(0);

        setGroupError("");

        setRefreshing(false);

        setRefreshDistance(0);

        refreshDistanceRef.current =
            0;
    }

    // =====================================================
    // LEAVE CHAT
    // =====================================================

    function handleLeave() {

        clearSavedGroup();

        localStorage.removeItem(
            "chatly_username"
        );

        socket.disconnect();

        setJoined(false);

        setCurrentGroup(null);

        setShowMembers(false);

        setShowGroupInfo(false);

        setGroupIdCopied(false);

        setGroupOnlineUsers(0);

        setGroups([]);

        setGroupSearch("");

        setGroupName("");

        setMessage("");

        setMessages([]);

        setTypingUser("");

        setDeleteMessageIndex(null);

        setSwipedMessageIndex(null);

        setActiveSwipeIndex(null);

        setReplyingTo(null);

        setSwipeOffset(0);

        setRestoringSession(false);

        setRefreshing(false);

        setRefreshDistance(0);

        refreshDistanceRef.current =
            0;

        setTimeout(() => {

            socket.connect();

        }, 100);
    }

    // =====================================================
    // JOIN CHAT
    // =====================================================

    function handleJoin() {

        let cleanUsername =
            username.trim();

        if (
            cleanUsername === ""
        ) {

            cleanUsername =
                `Anonymous-${socket.id
                    ? socket.id.slice(-6)
                    : Math.random()
                        .toString(36)
                        .slice(-6)
                }`;
        }

        if (
            cleanUsername.length < 2
        ) {

            setAlertMessage(
                "Nickname must be at least 2 characters"
            );

            return;
        }

        if (
            cleanUsername.length > 20
        ) {

            setAlertMessage(
                "Nickname must be 20 characters or less"
            );

            return;
        }

        setUsername(
            cleanUsername
        );

        localStorage.setItem(
            "chatly_username",
            cleanUsername
        );

        setAlertMessage("");

        socket.emit(
            "join_chat",
            cleanUsername
        );
    }

    // =====================================================
    // CREATE GROUP
    // =====================================================

    function handleCreateGroup() {

        const cleanGroupName =
            groupName.trim();

        if (
            cleanGroupName === ""
        ) {

            setGroupError(
                "Please enter a group name"
            );

            return;
        }

        if (
            cleanGroupName.length < 2
        ) {

            setGroupError(
                "Group name must be at least 2 characters"
            );

            return;
        }

        if (
            cleanGroupName.length > 50
        ) {

            setGroupError(
                "Group name must be 50 characters or less"
            );

            return;
        }

        setGroupError("");

        socket.emit(
            "create_group",
            {
                name:
                    cleanGroupName
            }
        );

        setGroupName("");

        setShowCreateGroup(false);
    }

    // =====================================================
    // JOIN GROUP
    // =====================================================

    function handleJoinGroup(groupId) {

        if (!groupId) {

            setGroupError(
                "Invalid group"
            );

            return;
        }

        if (!socket.connected) {

            setGroupError(
                "Connection to server lost. Please try again."
            );

            return;
        }

        setGroupError("");

        socket.emit(
            "join_group",
            String(groupId)
        );
    }

    // =====================================================
    // JOIN GROUP BY ID
    // =====================================================

    function handleJoinGroupById() {

        const cleanGroupCode =
            groupCode.trim();

        if (!cleanGroupCode) {

            setGroupError(
                "Please enter a group code"
            );

            return;
        }

        if (!socket.connected) {

            setGroupError(
                "Connection to server lost. Please try again."
            );

            return;
        }

        setGroupError("");

        socket.emit(
            "join_group",
            cleanGroupCode
        );

        setGroupCode("");

        setShowJoinGroup(false);
    }

    // =====================================================
    // TYPING
    // =====================================================

    function handleTyping(event) {

        const value =
            event.target.value;

        setMessage(value);

        clearTimeout(
            typingTimeoutRef.current
        );

        if (
            value.trim() === ""
        ) {

            socket.emit(
                "stop_typing"
            );

            return;
        }

        if (!currentGroup) {
            return;
        }

        socket.emit(
            "typing",
            username
        );

        typingTimeoutRef.current =
            setTimeout(() => {

                socket.emit(
                    "stop_typing"
                );

            }, 1000);
    }

    // =====================================================
    // SEND MESSAGE
    // =====================================================

    function handleSend() {

        const cleanMessage =
            message.trim();

        if (
            cleanMessage === "" ||
            !currentGroup
        ) {
            return;
        }

        if (
            cleanMessage.length > 500
        ) {

            setAlertMessage(
                "Message cannot be longer than 500 characters"
            );

            return;
        }

        /*
         * Don't try to send while socket is disconnected.
         */
        if (!socket.connected) {

            setAlertMessage(
                "Connection lost. Reconnecting..."
            );

            socket.connect();

            return;
        }

        const tempId =
            `temp-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 9)}`;

        const clientKey =
            `client-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 9)}`;

        const messageTime =
            new Date().toLocaleTimeString(
                [],
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );

        const newMessage = {

            id:
                tempId,

            tempId,

            clientKey,

            username,

            text:
                cleanMessage,

            time:
                messageTime,

            groupId:
                currentGroup.id,

            sending:
                true,

            failed:
                false,

            replyTo:
                replyingTo
                    ? {
                        id:
                            replyingTo.id,

                        username:
                            replyingTo.username,

                        text:
                            replyingTo.text
                    }
                    : null
        };

        setMessages(
            previousMessages => [
                ...previousMessages,
                newMessage
            ]
        );

        socket.emit(
            "send_message",
            newMessage,
            response => {

                if (!response?.success) {

                    setMessages(
                        previousMessages =>
                            previousMessages.map(
                                msg =>
                                    msg.tempId ===
                                        tempId
                                        ? {
                                            ...msg,

                                            sending:
                                                false,

                                            failed:
                                                true
                                        }
                                        : msg
                            )
                    );

                    return;
                }

                if (
                    response?.success &&
                    response.message
                ) {

                    setMessages(
                        previousMessages =>
                            previousMessages.map(
                                msg =>
                                    msg.tempId ===
                                        tempId
                                        ? {
                                            ...response.message,

                                            clientKey:
                                                msg.clientKey,

                                            tempId:
                                                undefined,

                                            sending:
                                                false,

                                            failed:
                                                false
                                        }
                                        : msg
                            )
                    );

                    return;
                }
            }
        );

        socket.emit(
            "stop_typing"
        );

        clearTimeout(
            typingTimeoutRef.current
        );

        setMessage("");

        setReplyingTo(null);

        setAlertMessage("");
    }

    // =====================================================
    // COPY MESSAGE
    // =====================================================

    function handleCopy(text) {

        if (
            !text ||
            !navigator.clipboard
        ) {
            return;
        }

        navigator.clipboard
            .writeText(text)
            .then(() => {

                setCopied(true);

                setTimeout(() => {

                    setCopied(false);

                }, 1500);

            })
            .catch(() => { });
    }

    // =====================================================
    // TOGGLE USERNAME
    // =====================================================

    function toggleUsername() {

        setShowUsername(
            previous =>
                !previous
        );
    }

    // =====================================================
    // RESTORING SCREEN
    // =====================================================

    if (
        restoringSession
    ) {

        return (
            <div className="join-container">

                <div className="join-box">

                    <h1>
                        Chat App
                    </h1>

                    <p className="join-subtitle">
                        Restoring your chat...
                    </p>

                </div>

            </div>
        );
    }

    // =====================================================
    // JOIN SCREEN
    // =====================================================

    if (!joined) {

        return (
            <div className="join-container">

                <div className="join-box">

                    <h1>
                        Chat App
                    </h1>

                    <p className="join-subtitle">
                        Chat anonymously. Stay private.
                    </p>

                    {alertMessage && (
                        <div className="alert-message">
                            {alertMessage}
                        </div>
                    )}

                    {showAnonymousNotice && (
                        <div className="anonymous-notice">

                            <div className="anonymous-notice-content">

                                <button
                                    type="button"
                                    className="anonymous-notice-close"
                                    onClick={() =>
                                        setShowAnonymousNotice(false)
                                    }
                                    aria-label="Close anonymous notice"
                                >
                                    ✕
                                </button>

                                <strong>
                                    🔒 Stay Anonymous
                                </strong>

                                <p>
                                    Chatly allows you to chat without revealing your real identity.
                                    Choose any username and start chatting—other users won't know
                                    who you really are unless you choose to tell them.
                                </p>

                            </div>

                        </div>
                    )}
                    <input
                        type="text"
                        value={username}
                        maxLength={20}
                        placeholder="Enter your username"
                        onChange={event => {

                            setUsername(
                                event.target.value
                            );

                            setAlertMessage("");
                        }}
                        onKeyDown={event => {

                            if (
                                event.key ===
                                "Enter"
                            ) {

                                handleJoin();
                            }
                        }}
                    />

                    <button
                        onClick={
                            handleJoin
                        }
                    >
                        Join
                    </button>

                    <div className="privacy-note">
                        Stay private. Use a nickname.
                    </div>

                </div>

            </div>
        );
    }

    // =====================================================
    // GROUP SCREEN
    // =====================================================

    if (
        joined &&
        !currentGroup
    ) {

        const filteredGroups =
            groups.filter(
                group =>
                    group.name
                        .toLowerCase()
                        .includes(
                            groupSearch
                                .toLowerCase()
                        )
            );

        return (
            <div className="group-container">

                <div className="group-box">

                    <div className="group-header">

                        <div>

                            <h1>
                                Chat App
                            </h1>

                            <p>
                                Welcome!
                            </p>

                        </div>

                        <button
                            className="group-leave-button"
                            onClick={
                                handleLeave
                            }
                        >
                            Leave
                        </button>

                    </div>

                    <input
                        className="group-search"
                        type="text"
                        value={groupSearch}
                        placeholder="🔍 Search groups..."
                        onChange={event => {

                            setGroupSearch(
                                event.target.value
                            );

                            setGroupError("");
                        }}
                    />

                    {groupError && (
                        <div className="group-error">
                            {groupError}
                        </div>
                    )}

                    <div className="group-list">

                        {filteredGroups.length > 0 ? (

                            filteredGroups.map(
                                group => (

                                    <div
                                        key={group.id}
                                        className="group-item"
                                    >

                                        <span className="group-icon">
                                            👥
                                        </span>

                                        <span className="group-info">

                                            <strong>
                                                {group.name}
                                            </strong>

                                            <small>
                                                {group.members?.length || 0}{" "}
                                                member
                                                {(group.members?.length || 0) !== 1
                                                    ? "s"
                                                    : ""}
                                            </small>

                                        </span>

                                        <button
                                            type="button"
                                            className="join-group-button"
                                            onClick={() =>
                                                handleJoinGroup(
                                                    group.id
                                                )
                                            }
                                        >
                                            Join
                                        </button>

                                    </div>
                                )
                            )

                        ) : (

                            <div className="no-groups">

                                <div className="no-groups-icon">
                                    👥
                                </div>

                                <h3>
                                    No groups found
                                </h3>

                                <p>
                                    Create one and start chatting!
                                </p>

                            </div>
                        )}

                    </div>

                    <button
                        className="join-group-id-button"
                        onClick={() => {

                            setShowJoinGroup(true);

                            setGroupError("");
                        }}
                    >
                        🔗 Join by Group ID
                    </button>

                    {showJoinGroup && (

                        <div className="join-group-id-box">

                            <input
                                type="text"
                                value={groupCode}
                                placeholder="Enter group ID..."
                                autoFocus
                                onChange={event => {

                                    setGroupCode(
                                        event.target.value
                                    );

                                    setGroupError("");
                                }}
                                onKeyDown={event => {

                                    if (
                                        event.key ===
                                        "Enter"
                                    ) {

                                        handleJoinGroupById();
                                    }

                                    if (
                                        event.key ===
                                        "Escape"
                                    ) {

                                        setShowJoinGroup(false);

                                        setGroupCode("");
                                    }
                                }}
                            />

                            <div className="join-group-id-actions">

                                <button
                                    className="cancel-group-button"
                                    onClick={() => {

                                        setShowJoinGroup(false);

                                        setGroupCode("");

                                        setGroupError("");
                                    }}
                                >
                                    Cancel
                                </button>

                                <button
                                    className="confirm-group-button"
                                    onClick={
                                        handleJoinGroupById
                                    }
                                >
                                    Join
                                </button>

                            </div>

                        </div>
                    )}

                    {!showCreateGroup ? (

                        <button
                            className="create-group-button"
                            onClick={() => {

                                setShowCreateGroup(true);

                                setGroupError("");
                            }}
                        >
                            ➕ Create Group
                        </button>

                    ) : (

                        <div className="create-group-box">

                            <input
                                type="text"
                                value={groupName}
                                maxLength={50}
                                autoFocus
                                placeholder="Enter group name..."
                                onChange={event => {

                                    setGroupName(
                                        event.target.value
                                    );

                                    setGroupError("");
                                }}
                                onKeyDown={event => {

                                    if (
                                        event.key ===
                                        "Enter"
                                    ) {

                                        handleCreateGroup();
                                    }

                                    if (
                                        event.key ===
                                        "Escape"
                                    ) {

                                        setShowCreateGroup(false);

                                        setGroupName("");
                                    }
                                }}
                            />

                            <div className="create-group-actions">

                                <button
                                    className="cancel-group-button"
                                    onClick={() => {

                                        setShowCreateGroup(false);

                                        setGroupName("");

                                        setGroupError("");
                                    }}
                                >
                                    Cancel
                                </button>

                                <button
                                    className="confirm-group-button"
                                    onClick={
                                        handleCreateGroup
                                    }
                                >
                                    Create
                                </button>

                            </div>

                        </div>
                    )}

                </div>

            </div>
        );
    }

    // =====================================================
    // CHAT SCREEN
    // =====================================================

    return (
        <div className="chat-app">

            {copied && (
                <div className="copied-notification">
                    ✓ Copied!
                </div>
            )}

            {/* =====================================================
                HEADER
            ===================================================== */}

            <header
                className="chat-header"
                onTouchStart={
                    handleRefreshTouchStart
                }
                onTouchMove={
                    handleRefreshTouchMove
                }
                onTouchEnd={
                    handleRefreshTouchEnd
                }
                onTouchCancel={() => {

                    refreshPullingRef.current =
                        false;

                    refreshDistanceRef.current =
                        0;

                    setRefreshDistance(0);
                }}
            >

                {/* =================================================
                    HEADER PULL REFRESH INDICATOR
                    ================================================= */}

                {(
                    refreshDistance > 0 ||
                    refreshing
                ) && (

                        <div
                            className={`header-refresh-indicator ${refreshing ? "refreshing" : ""
                                }`}
                            style={{
                                transform:
                                    refreshing
                                        ? "translate(-50%, 38px)"
                                        : `translate(-50%, ${Math.min(
                                            refreshDistance * 0.55,
                                            55
                                        )}px) rotate(${Math.min(
                                            (refreshDistance / 100) * 360,
                                            360
                                        )}deg)`
                            }}
                        >
                            ↻
                        </div>
                    )}

                <div className="header-left">

                    <div
                        className={`username ${showUsername
                            ? "username-visible"
                            : "username-hidden"
                            }`}
                        onClick={
                            toggleUsername
                        }
                        role="button"
                        tabIndex={0}
                        onKeyDown={event => {

                            if (
                                event.key ===
                                "Enter"
                            ) {

                                toggleUsername();
                            }
                        }}
                    >

                        <button
                            type="button"
                            className={`profile-button ${showUsername
                                ? "profile-active"
                                : ""
                                }`}
                            onClick={event => {

                                event.stopPropagation();

                                toggleUsername();
                            }}
                            aria-label="Toggle username"
                            aria-pressed={
                                showUsername
                            }
                        >

                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >

                                <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5m0-8c1.65 0 3 1.35 3 3s-1.35 3-3 3-3-1.35-3-3 1.35-3 3-3M4 22h16c.55 0 1-.45 1-1v-1c0-3.86-3.14-7-7-7h-4c-3.86 0-7 3.14-7 7v1c0 .55.45 1 1 1m6-7h4c2.76 0 5 2.24 5 5H5c0-2.76 2.24-5 5-5"></path>

                            </svg>

                        </button>

                        <span
                            className={
                                showUsername
                                    ? "username-text username-show"
                                    : "username-text username-hide"
                            }
                        >
                            {username}
                        </span>

                    </div>

                    <button
                        type="button"
                        className="members-button"
                        onClick={() =>
                            setShowMembers(true)
                        }
                        title="Group members"
                        aria-label="Group members"
                    >
                        👥
                        <span>
                            {
                                currentGroup
                                    ?.members
                                    ?.length ||
                                0
                            }
                        </span>
                    </button>

                </div>

                <button
                    type="button"
                    className={`chat-group-title ${showGroupInfo
                        ? "chat-group-title-active"
                        : ""
                        }`}
                    onClick={
                        toggleGroupInfo
                    }
                    title="Group information"
                >
                    {currentGroup?.name || "Chatly"}
                </button>

                <div className="header-right">

                    <span className="online-count">
                        🟢{" "}
                        {groupOnlineUsers}{" "}
                        online
                    </span>

                    <button
                        type="button"
                        className="leave-button"
                        onClick={
                            handleLeaveGroup
                        }
                    >
                        Groups
                    </button>

                </div>

            </header>

            {/* =====================================================
                GROUP INFO POPUP
            ===================================================== */}

            {showGroupInfo && currentGroup && (

                <div
                    className="group-info-overlay"
                    onClick={() =>
                        setShowGroupInfo(false)
                    }
                >

                    <div
                        className="group-info-popup"
                        onClick={event =>
                            event.stopPropagation()
                        }
                    >

                        <div className="group-info-header">

                            <div>

                                <h3>
                                    {currentGroup.name}
                                </h3>

                                <span>
                                    Group Information
                                </span>

                            </div>

                            <button
                                type="button"
                                className="group-info-close"
                                onClick={() =>
                                    setShowGroupInfo(false)
                                }
                            >
                                ✕
                            </button>

                        </div>

                        <div className="group-id-section">

                            <span className="group-id-label">
                                Group ID
                            </span>

                            <div className="group-id-row">

                                <code>
                                    {currentGroup.groupCode}
                                </code>

                                <button
                                    type="button"
                                    className="copy-group-id-button"
                                    onClick={
                                        handleCopyGroupId
                                    }
                                >
                                    {groupIdCopied
                                        ? "✓ Copied"
                                        : "📋 Copy"}
                                </button>

                            </div>

                        </div>

                        <div className="group-info-members">

                            <span>
                                👥 Members
                            </span>

                            <strong>
                                {
                                    currentGroup
                                        ?.members
                                        ?.length ||
                                    0
                                }
                            </strong>

                        </div>

                        <div className="group-info-creator">

                            <span>
                                👑 Creator
                            </span>

                            <strong>
                                {
                                    currentGroup.creator
                                }
                            </strong>

                        </div>

                        {currentGroup.creator === username && (

                            <button
                                type="button"
                                className="popup-delete-group-button"
                                onClick={
                                    handleDeleteGroup
                                }
                            >
                                🗑️ Delete Group
                            </button>

                        )}

                    </div>

                </div>
            )}

            {/* =====================================================
                GROUP MEMBERS PANEL
            ===================================================== */}

            {showMembers && (

                <div
                    className="members-overlay"
                    onClick={() =>
                        setShowMembers(false)
                    }
                >

                    <div
                        className="members-panel"
                        onClick={event =>
                            event.stopPropagation()
                        }
                    >

                        <div className="members-header">

                            <div>

                                <h3>
                                    Group Members
                                </h3>

                                <span>

                                    {
                                        currentGroup
                                            ?.members
                                            ?.length ||
                                        0
                                    }{" "}
                                    member
                                    {
                                        (
                                            currentGroup
                                                ?.members
                                                ?.length ||
                                            0
                                        ) !== 1
                                            ? "s"
                                            : ""
                                    }

                                </span>

                            </div>

                            <button
                                type="button"
                                className="members-close-button"
                                onClick={() =>
                                    setShowMembers(false)
                                }
                            >
                                ✕
                            </button>

                        </div>

                        <div className="members-list">

                            {currentGroup?.members
                                ?.length > 0 ? (

                                currentGroup.members.map(
                                    member => {

                                        const isCreator =
                                            member ===
                                            currentGroup.creator;

                                        const isCurrentUser =
                                            member ===
                                            username;

                                        return (
                                            <div
                                                className="member-item"
                                                key={member}
                                            >

                                                <div className="member-avatar">

                                                    {member
                                                        .charAt(0)
                                                        .toUpperCase()}

                                                </div>

                                                <div className="member-info">

                                                    <strong>
                                                        {member}
                                                    </strong>

                                                    {isCurrentUser && (
                                                        <span className="you-label">
                                                            You
                                                        </span>
                                                    )}

                                                </div>

                                                {isCreator && (
                                                    <span className="creator-badge">
                                                        👑 Creator
                                                    </span>
                                                )}

                                            </div>
                                        );
                                    }
                                )

                            ) : (

                                <div className="no-members">
                                    No members
                                </div>

                            )}

                        </div>

                    </div>

                </div>
            )}

            {/* =====================================================
                MESSAGES
            ===================================================== */}

            <div
                className="messages"
                ref={messagesContainerRef}
            >

                {messages.map(
                    (msg, index) => {

                        // -------------------------------------------------
                        // SYSTEM MESSAGE
                        // -------------------------------------------------

                        if (
                            msg.type ===
                            "system"
                        ) {

                            return (
                                <div
                                    className={`system-message ${msg.status}`}
                                    key={
                                        msg.clientKey ||
                                        `system-${index}`
                                    }
                                >

                                    {
                                        msg.status ===
                                            "joined"
                                            ? "🟢"
                                            : "🔴"
                                    }{" "}

                                    {msg.text}

                                </div>
                            );
                        }

                        // -------------------------------------------------
                        // MESSAGE
                        // -------------------------------------------------

                        const isMyMessage =
                            msg.username ===
                            username;

                        const isDeleted =
                            msg.deleted === true;

                        const isSwiped =
                            swipedMessageIndex ===
                            index;

                        const showDelete =
                            deleteMessageIndex ===
                            index &&
                            isMyMessage;

                        const showActions =
                            (
                                isSwiped ||
                                showDelete
                            ) &&
                            !isDeleted;

                        const currentSwipeOffset =
                            activeSwipeIndex ===
                                index
                                ? swipeOffset
                                : 0;

                        return (

                            <div
                                id={`message-${msg.id}`}
                                key={
                                    msg.clientKey ||
                                    msg.id ||
                                    `message-${index}`
                                }
                                className={`message ${isMyMessage
                                    ? "my-message"
                                    : ""
                                    } ${isDeleted
                                        ? "deleted-message"
                                        : ""
                                    } ${isSwiped
                                        ? "message-swiped"
                                        : ""
                                    }`}
                                style={{
                                    transform:
                                        currentSwipeOffset > 0
                                            ? `translateX(${currentSwipeOffset}px)`
                                            : "translateX(0)",

                                    animation:
                                        "none",

                                    transition:
                                        "none"
                                }}
                                onTouchStart={event =>
                                    handleTouchStart(
                                        event,
                                        index,
                                        isDeleted
                                    )
                                }
                                onTouchMove={event =>
                                    handleTouchMove(
                                        event,
                                        index
                                    )
                                }
                                onTouchEnd={() =>
                                    handleTouchEnd(
                                        msg,
                                        index
                                    )
                                }
                                onTouchCancel={
                                    handleTouchCancel
                                }
                                onContextMenu={event =>
                                    openMessageActions(
                                        event,
                                        index,
                                        msg
                                    )
                                }
                            >

                                {/* =================================================
                                    NAME + SENDING CLOCK
                                    ================================================= */}

                                <div className="message-name-row">

                                    <strong>
                                        {msg.username}
                                    </strong>

                                    {!isDeleted &&
                                        msg.sending === true && (

                                            <span
                                                className="message-time message-sending"
                                                title="Sending..."
                                            >
                                                ◷
                                            </span>

                                        )}

                                </div>

                                {/* =================================================
                                    REPLY
                                    ================================================= */}

                                {msg.replyTo &&
                                    !isDeleted && (

                                        <div
                                            className="replied-message"
                                            onClick={() => {

                                                document
                                                    .getElementById(
                                                        `message-${msg.replyTo.id}`
                                                    )
                                                    ?.scrollIntoView({
                                                        behavior:
                                                            "smooth",

                                                        block:
                                                            "center"
                                                    });
                                            }}
                                        >

                                            <strong>
                                                {
                                                    msg
                                                        .replyTo
                                                        .username
                                                }
                                            </strong>

                                            <p>
                                                {
                                                    msg
                                                        .replyTo
                                                        .text
                                                }
                                            </p>

                                        </div>
                                    )}

                                {/* =================================================
                                    MESSAGE TEXT + TIME
                                    ================================================= */}

                                <div className="message-row">

                                    <p
                                        className={`message-text ${isDeleted
                                            ? "deleted-text"
                                            : ""
                                            }`}
                                        onClick={() => {

                                            if (
                                                !isDeleted &&
                                                !touchMovedRef.current
                                            ) {

                                                handleCopy(
                                                    msg.text
                                                );
                                            }
                                        }}
                                    >

                                        {isDeleted
                                            ? "This message was deleted"
                                            : msg.text}

                                    </p>

                                    {!isDeleted && (

                                        <span className="message-time">

                                            {msg.time}

                                        </span>

                                    )}

                                </div>

                                {msg.reaction &&
                                    !isDeleted && (

                                        <div className="message-reaction">
                                            {msg.reaction}
                                        </div>
                                    )}

                                {/* =================================================
                                    ACTIONS
                                    ================================================= */}

                                {showActions && (

                                    <div
                                        className="message-actions"
                                        onClick={event =>
                                            event.stopPropagation()
                                        }
                                        onPointerDown={event => {

                                            event.stopPropagation();

                                            clearTimeout(
                                                longPressTimerRef.current
                                            );

                                            isSwipingRef.current =
                                                false;

                                            touchMovedRef.current =
                                                false;

                                            longPressTriggeredRef.current =
                                                false;
                                        }}
                                        onTouchStart={
                                            handleActionTouchStart
                                        }
                                        onTouchMove={
                                            handleActionTouchMove
                                        }
                                        onTouchEnd={
                                            handleActionTouchEnd
                                        }
                                        onTouchCancel={
                                            handleActionTouchEnd
                                        }
                                    >

                                        <button
                                            type="button"
                                            className="reply-message"
                                            onTouchStart={event => {

                                                event.stopPropagation();

                                                clearTimeout(
                                                    longPressTimerRef.current
                                                );
                                            }}
                                            onTouchMove={event => {

                                                event.stopPropagation();
                                            }}
                                            onTouchEnd={event => {

                                                event.stopPropagation();
                                            }}
                                            onClick={event => {

                                                event.preventDefault();

                                                event.stopPropagation();

                                                handleReply(msg);
                                            }}
                                            title="Reply"
                                        >
                                            ↩
                                        </button>

                                        {isMyMessage && (

                                            <button
                                                type="button"
                                                className="delete-message"
                                                onTouchStart={event => {

                                                    event.stopPropagation();

                                                    clearTimeout(
                                                        longPressTimerRef.current
                                                    );
                                                }}
                                                onTouchMove={event => {

                                                    event.stopPropagation();
                                                }}
                                                onTouchEnd={event => {

                                                    event.stopPropagation();
                                                }}
                                                onClick={event => {

                                                    event.preventDefault();

                                                    event.stopPropagation();

                                                    handleDeleteMessage(
                                                        msg
                                                    );
                                                }}
                                                title="Delete"
                                            >
                                                🗑️
                                            </button>
                                        )}

                                    </div>
                                )}

                            </div>
                        );
                    }
                )}

                {typingUser &&
                    typingUser !== username && (

                        <div className="typing-indicator">
                            {typingUser} is typing...
                        </div>
                    )}

                <div
                    ref={messagesEndRef}
                />

            </div>

            {/* =====================================================
                REPLY PREVIEW
            ===================================================== */}

            {replyingTo && (

                <div className="reply-preview">

                    <div>

                        <strong>
                            Replying to{" "}
                            {replyingTo.username}
                        </strong>

                        <p>
                            {replyingTo.text}
                        </p>

                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setReplyingTo(null)
                        }
                        title="Cancel reply"
                    >
                        ✕
                    </button>

                </div>
            )}

            {/* =====================================================
                INPUT
            ===================================================== */}

            <div className="chat-input">

                <input
                    ref={
                        messageInputRef
                    }
                    type="text"
                    value={message}
                    maxLength={500}
                    placeholder="Type a message..."
                    onChange={
                        handleTyping
                    }
                    onKeyDown={event => {

                        if (
                            event.key ===
                            "Enter"
                        ) {

                            event.preventDefault();

                            handleSend();
                        }
                    }}
                />

                <button
                    type="button"
                    onClick={
                        handleSend
                    }
                >
                    Send
                </button>

            </div>

        </div>
    );
}

export default App;