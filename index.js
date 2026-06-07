const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const { jwtVerify, createRemoteJWKSet } = require("jose-cjs");
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;
const port = process.env.PORT || 5000;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});







const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URI}/api/auth/jwks`)
)


const verifyToken = async (req, res, next) => {
    const header = req?.headers.authorization;
    if (!header) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const token = header.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const { payload } = await jwtVerify(token, JWKS);
        console.log(payload)
        next()
    } catch (error) {
        return res.status(401).json({ message: "Unauthorized" });
    }
}









async function run() {
    try {
        const db = client.db("youtube_clone");
        const usersCollection = db.collection("users");
        const videosCollection = db.collection("videos");
        const commentsCollection = db.collection("comments");

        app.get('/', (req, res) => {
            res.send("Hello from youtube clone server")
        });

        // 🎬 সব ভিডিও নিয়ে আসা 
        app.get('/videos', async (req, res) => {
            try {
                const videosWithChannels = await videosCollection.aggregate([
                    {
                        $lookup: {
                            from: "users",
                            localField: "userId",   // videos কালেকশনের String ফিল্ড
                            foreignField: "_id",    // users কালেকশনের String ফিল্ড
                            as: "channel"
                        }
                    },
                    {
                        $unwind: {
                            path: "$channel",
                            preserveNullAndEmptyArrays: true
                        }
                    }
                ]).toArray();

                res.send(videosWithChannels);
            } catch (error) {
                console.error("Aggregation Error:", error);
                res.status(500).send("Server Error");
            }
        });

        // সিঙ্গেল ভিডিও 
        app.get('/videos/:id', async (req, res) => {
            try {
                const id = req.params.id;

                // 🎯 ডাইনামিক আইডি হ্যান্ডেলার: 
                // আইডি যদি ভ্যালিড ওবজেক্ট আইডি ফরম্যাটের হয়, তবে সে ObjectId এবং String দুইভাবেই খুঁজবে
                let matchQuery = { _id: id }; // ডিফল্ট স্ট্রিং ম্যাচিং

                if (ObjectId.isValid(id)) {
                    matchQuery = {
                        $or: [
                            { _id: id },              // ম্যানুয়াল স্ট্রিং আইডির জন্য
                            { _id: new ObjectId(id) } // ফ্রন্টএন্ডের অরিজিনাল ObjectId এর জন্য
                        ]
                    };
                }

                const videoWithChannel = await videosCollection.aggregate([
                    {
                        // 🟢 এখন স্ট্রিং বা অবজেক্ট আইডি—যেকোনো একটা মিললেই ডাটা চলে আসবে
                        $match: matchQuery
                    },
                    {
                        // ভিডিওর userId ফিল্ডটিকে String-এ কনভার্ট করা (কারণ users কালেকশনের _id-ও String)
                        $addFields: {
                            userIdStr: { $toString: "$userId" }
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "userIdStr",
                            foreignField: "_id",
                            as: "channel"
                        }
                    },
                    {
                        $unwind: {
                            path: "$channel",
                            preserveNullAndEmptyArrays: true
                        }
                    }
                ]).toArray();

                if (videoWithChannel.length > 0) {
                    res.send(videoWithChannel[0]);
                } else {
                    res.status(404).send({ message: "Video not found" });
                }
            } catch (error) {
                console.error("Single Video Aggregation Error:", error);
                res.status(500).send("Server Error");
            }
        });

        // সিঙ্গেল ভিডিও লাইক রাউট
        app.put('/videos/:id/like', verifyToken, async (req, res) => {
            try {
                const videoId = req.params.id;
                const { userId } = req.body;

                if (!userId) return res.status(400).send({ message: "User ID required" });

                let query = { _id: videoId };
                if (ObjectId.isValid(videoId)) {
                    query = { $or: [{ _id: videoId }, { _id: new ObjectId(videoId) }] };
                }

                const video = await videosCollection.findOne(query);
                if (!video) return res.status(404).send({ message: "Video not found" });

                const isLiked = video.likes?.includes(userId);
                let updateDoc = isLiked
                    ? { $pull: { likes: userId } }
                    : { $addToSet: { likes: userId }, $pull: { dislikes: userId } };

                await videosCollection.updateOne({ _id: video._id }, updateDoc);
                res.send({ success: true });
            } catch (error) {
                res.status(500).send("Server Error");
            }
        });

        // কমেন্ট এডিট রাউট
        app.put('/videos/:videoId/comments/:commentId', verifyToken, async (req, res) => {
            try {
                const { commentId } = req.params;
                const { userId, text } = req.body;

                if (!userId) {
                    return res.status(400).send({ message: "User ID required" });
                }

                if (!text || !text.trim()) {
                    return res.status(400).send({ message: "Comment text required" });
                }

                let query = { _id: commentId };
                if (ObjectId.isValid(commentId)) {
                    query = { $or: [{ _id: commentId }, { _id: new ObjectId(commentId) }] };
                }

                const comment = await commentsCollection.findOne(query);
                if (!comment) {
                    return res.status(404).send({ message: "Comment not found" });
                }

                if (comment.userId !== userId) {
                    return res.status(403).send({ message: "You are not authorized to edit this comment" });
                }

                await commentsCollection.updateOne(
                    { _id: comment._id },
                    {
                        $set: {
                            text: text.trim(),
                            updatedAt: new Date().toISOString()
                        }
                    }
                );

                res.send({ success: true, message: "Comment updated successfully" });
            } catch (error) {
                console.error("Comment Update Error:", error);
                res.status(500).send({ message: "Failed to update comment" });
            }
        });

        // কমেন্ট ডিলিট রাউট
        app.delete('/videos/:videoId/comments/:commentId', verifyToken, async (req, res) => {
            try {
                const { videoId, commentId } = req.params;
                const { userId } = req.body;

                if (!userId) {
                    return res.status(400).send({ message: "User ID required" });
                }

                let query = { _id: commentId };
                if (ObjectId.isValid(commentId)) {
                    query = { $or: [{ _id: commentId }, { _id: new ObjectId(commentId) }] };
                }

                const comment = await commentsCollection.findOne(query);
                if (!comment) {
                    return res.status(404).send({ message: "Comment not found" });
                }

                if (comment.videoId !== videoId) {
                    return res.status(400).send({ message: "Comment does not belong to this video" });
                }

                if (comment.userId !== userId) {
                    return res.status(403).send({ message: "You are not authorized to delete this comment" });
                }

                await commentsCollection.deleteOne({ _id: comment._id });

                res.send({ success: true, message: "Comment deleted successfully" });
            } catch (error) {
                console.error("Comment Delete Error:", error);
                res.status(500).send({ message: "Failed to delete comment" });
            }
        });

        // সিঙ্গেল ভিডিও ডিসলাইক রাউট
        app.put('/videos/:id/dislike', verifyToken, async (req, res) => {
            try {
                const videoId = req.params.id;
                const { userId } = req.body;

                if (!userId) return res.status(400).send({ message: "User ID required" });

                let query = { _id: videoId };
                if (ObjectId.isValid(videoId)) {
                    query = { $or: [{ _id: videoId }, { _id: new ObjectId(videoId) }] };
                }

                const video = await videosCollection.findOne(query);
                if (!video) return res.status(404).send({ message: "Video not found" });

                const isDisliked = video.dislikes?.includes(userId);
                let updateDoc = isDisliked
                    ? { $pull: { dislikes: userId } }
                    : { $addToSet: { dislikes: userId }, $pull: { likes: userId } };

                await videosCollection.updateOne({ _id: video._id }, updateDoc);
                res.send({ success: true });
            } catch (error) {
                res.status(500).send("Server Error");
            }
        });

        // 👥 সব ইউজার গেট রাউট
        app.get('/users', async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users);
        });


        //  চ্যানেল সাবস্ক্রাইব এবং আনসাবস্ক্রাইব রাউট 
        app.put('/users/:id/subscribe', async (req, res) => {
            try {
                const { id: channelId } = req.params;
                const { userId, isSubscribing } = req.body;

                if (!userId || !channelId) {
                    return res.status(400).send({ message: "User ID and Channel ID are required" });
                }


                if (userId === channelId) {
                    return res.status(400).send({ message: "You cannot subscribe to your own channel" });
                }

                const changeValue = isSubscribing ? 1 : -1;


                await usersCollection.updateOne(
                    { _id: channelId },
                    { $inc: { subscribers: changeValue } }
                );


                let userUpdateDoc = isSubscribing
                    ? { $addToSet: { following: channelId } }
                    : { $pull: { following: channelId } };

                await usersCollection.updateOne(
                    { _id: userId },
                    userUpdateDoc,
                    { upsert: true }
                );

                res.send({ success: true, isSubscribed: isSubscribing });
            } catch (error) {
                console.error("Subscribe Error:", error);
                res.status(500).send("Server Error");
            }
        });




        // 👤 সিঙ্গেল ইউজার ডাটা রাউট
        app.get('/users/:userId', async (req, res) => {
            const { userId } = req.params;
            // প্রথমে "users" (plural) কালেকশনে খোঁজে
            let result = await usersCollection.findOne({ _id: userId });

            // না পেলে "user" (singular / Better-Auth) কালেকশনে খোঁজে
            if (!result) {
                const userCollection = db.collection("user");
                result = await userCollection.findOne({ _id: userId });
            }

            res.json(result);
        });

        //  নির্দিষ্ট চ্যানেলের প্রোফাইল ও ভিডিও ডাটা গেট রাউট
        app.get('/channels/:id', async (req, res) => {
            try {
                const channelId = req.params.id;
                const channelProfile = await usersCollection.findOne({ _id: channelId });

                if (!channelProfile) {
                    return res.status(404).send({ message: "Channel not found" });
                }

                const channelVideos = await videosCollection.find({ userId: channelId }).toArray();

                res.send({
                    profile: channelProfile,
                    videos: channelVideos
                });
            } catch (error) {
                console.error("Channel Profile API Error:", error);
                res.status(500).send("Server Error");
            }
        });

        //  চ্যানেল ক্রিয়েট/আপডেট রাউট 
        app.post('/api/channel/create', verifyToken, async (req, res) => {
            try {
                const { userId, channelName, username, bio, avatar, coverImage } = req.body;

                if (!userId || !channelName || !username) {
                    return res.status(400).send({ message: "Required fields missing (userId, channelName, username)" });
                }

                const updateDoc = {
                    $set: {
                        username: username,
                        channelName: channelName,
                        bio: bio || "Full‑stack developer simplifying coding for everyone.",
                        avatar: avatar || "https://randomuser.me/api/portraits/men/32.jpg",
                        coverImage: coverImage || "https://picsum.photos/id/0/1200/300",
                        subscribers: 0,
                        totalVideos: 0,
                        createdAt: new Date().toISOString()
                    }
                };

                await usersCollection.updateOne(
                    { _id: userId },
                    updateDoc,
                    { upsert: true }
                );

                res.send({ success: true });
            } catch (error) {
                console.error("Create Channel Error:", error);
                res.status(500).send("Server Error");
            }
        });

        //  ভিডিও আপলোড রাউট
        app.post('/api/video/upload', verifyToken, async (req, res) => {
            try {
                const { userId, title, description, videoUrl, thumbnailUrl, durationText, category, tags } = req.body;

                const newVideo = {
                    userId,
                    title,
                    description: description || "",
                    videoUrl,
                    thumbnailUrl: thumbnailUrl || "https://picsum.photos/id/42/640/360",
                    durationText: durationText || "0:00", // ফ্রন্টএন্ড কার্ডের জন্য এটি দরকার
                    category: category || "Education",
                    tags: tags || [],
                    views: 0,
                    likes: [],
                    dislikes: [],
                    isPublished: true,
                    createdAt: new Date() // প্রপার আইএসও ডেট জেনারেট করবে
                };

                const result = await videosCollection.insertOne(newVideo);
                res.status(201).send(result);
            } catch (error) {
                console.error("Upload Error:", error);
                res.status(500).send({ message: "Failed to upload video" });
            }
        });




        // নির্দিষ্ট ভিডিওর সব কমেন্ট গেট 
        app.get('/videos/:id/comments', async (req, res) => {
            try {
                const videoId = req.params.id;

                // Aggregation দিয়ে কমেন্টের সাথে ইউজারের ইনফরমেশন (যেমন নাম, ছবি) যুক্ত করা
                const comments = await commentsCollection.aggregate([
                    { $match: { videoId } },
                    { $sort: { createdAt: -1 } }, // নতুন কমেন্টগুলো আগে দেখাবে
                    {
                        $addFields: {
                            userIdStr: { $toString: "$userId" }
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "userIdStr",
                            foreignField: "_id",
                            as: "user"
                        }
                    },
                    {
                        $unwind: {
                            path: "$user",
                            preserveNullAndEmptyArrays: true
                        }
                    }
                ]).toArray();

                res.send(comments);
            } catch (error) {
                console.error("Fetch Comments Error:", error);
                res.status(500).send("Server Error");
            }
        });

        // নতুন কমেন্ট পোস্ট করার রাউট (লগইন করা ইউজারদের জন্য)
        app.post('/videos/:id/comments', verifyToken, async (req, res) => {
            try {
                const videoId = req.params.id;
                const { userId, text } = req.body;

                if (!userId || !text) {
                    return res.status(400).send({ message: "User ID and text are required" });
                }

                const newComment = {
                    videoId,
                    userId,
                    text,
                    createdAt: new Date().toISOString()
                };

                const result = await commentsCollection.insertOne(newComment);
                res.status(201).send(result);
            } catch (error) {
                console.error("Post Comment Error:", error);
                res.status(500).send("Server Error");
            }
        });

        // ভিডিও এডিট করার রাউট (লগইন করা উজারদের জন্য)
        app.put('/api/video/:id', verifyToken, async (req, res) => {
            try {
                const videoId = req.params.id;
                const { userId, title, description, thumbnailUrl, category, tags } = req.body;

                if (!userId) {
                    return res.status(400).send({ message: "User ID required" });
                }

                // ভিডিও খোঁজা (স্ট্রিং ও ObjectId দুটোই সাপোর্ট করে)
                let query = { _id: videoId };
                if (ObjectId.isValid(videoId)) {
                    query = { $or: [{ _id: videoId }, { _id: new ObjectId(videoId) }] };
                }

                const video = await videosCollection.findOne(query);
                if (!video) {
                    return res.status(404).send({ message: "Video not found" });
                }

                // শুধুমাত্র ভিডিওর মালিকই এডিট করতে পারবে
                if (video.userId !== userId) {
                    return res.status(403).send({ message: "You are not authorized to edit this video" });
                }

                // শুধুমাত্র যেসব ফিল্ড পাঠানো হয়েছে সেগুলোই আপডেট হবে
                const updateFields = {};
                if (title !== undefined) updateFields.title = title;
                if (description !== undefined) updateFields.description = description;
                if (thumbnailUrl !== undefined) updateFields.thumbnailUrl = thumbnailUrl;
                if (category !== undefined) updateFields.category = category;
                if (tags !== undefined) updateFields.tags = tags;
                updateFields.updatedAt = new Date().toISOString();

                await videosCollection.updateOne(
                    { _id: video._id },
                    { $set: updateFields }
                );

                res.send({ success: true, message: "Video updated successfully" });
            } catch (error) {
                console.error("Video Update Error:", error);
                res.status(500).send({ message: "Failed to update video" });
            }
        });

        // ভিডিও ডিলিট রাউট
        app.delete('/api/video/:id', verifyToken, async (req, res) => {
            try {
                const videoId = req.params.id;
                const { userId } = req.body;

                if (!userId) {
                    return res.status(400).send({ message: "User ID required" });
                }

                // ভিডিও খোঁজা
                let query = { _id: videoId };
                if (ObjectId.isValid(videoId)) {
                    query = { $or: [{ _id: videoId }, { _id: new ObjectId(videoId) }] };
                }

                const video = await videosCollection.findOne(query);
                if (!video) {
                    return res.status(404).send({ message: "Video not found" });
                }

                // শুধুমাত্র ভিডিওর মালিকই ডিলিট করতে পারবে
                if (video.userId !== userId) {
                    return res.status(403).send({ message: "You are not authorized to delete this video" });
                }

                // ভিডিও ডিলিট
                await videosCollection.deleteOne({ _id: video._id });

                // এই ভিডিওর সব কমেন্টও ডিলিট করা
                await commentsCollection.deleteMany({ videoId: videoId });

                res.send({ success: true, message: "Video deleted successfully" });
            } catch (error) {
                console.error("Video Delete Error:", error);
                res.status(500).send({ message: "Failed to delete video" });
            }
        });






        //  লাইব্রেরি পেজের জন্য: লগইন করা ইউজারের লাইক দেওয়া সব ভিডিও 
        app.get('/api/library/liked-videos', verifyToken, async (req, res) => {
            try {

                const { userId } = req.query;

                if (!userId) {
                    return res.status(400).send({ message: "User ID required" });
                }


                const likedVideos = await videosCollection.aggregate([
                    {
                        $match: { likes: userId }
                    },
                    {
                        $addFields: {
                            userIdStr: { $toString: "$userId" }
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "userIdStr",
                            foreignField: "_id",
                            as: "channel"
                        }
                    },
                    {
                        $unwind: {
                            path: "$channel",
                            preserveNullAndEmptyArrays: true
                        }
                    }
                ]).toArray();

                res.send(likedVideos);
            } catch (error) {
                console.error("Liked Videos Fetch Error:", error);
                res.status(500).send("Server Error");
            }
        });

        // লাইব্রেরি পেজের জন্য: ইউজার যেসব চ্যানেল সাবস্ক্রাইব করেছে তাদের লিস্ট  নিয়ে আসা
        app.get('/api/library/subscribed-channels', verifyToken, async (req, res) => {
            try {
                const { userId } = req.query;
                if (!userId) {
                    return res.status(400).send({ message: "User ID required" });
                }
                // প্রথমে "users"-এ খোঁজে, না পেলে "user" (Better-Auth) কালেকশনে খোঁজে
                let userProfile = await usersCollection.findOne({ _id: userId });
                if (!userProfile) {
                    const userCollection = db.collection("user");
                    userProfile = await userCollection.findOne({ _id: userId });
                }
                if (!userProfile || !userProfile.following || userProfile.following.length === 0) {
                    return res.send([]);
                }


                const subscribedChannels = await usersCollection.find(
                    { _id: { $in: userProfile.following } },
                    { projection: { channelName: 1, avatar: 1, subscribers: 1 } }
                ).toArray();

                res.send(subscribedChannels);
            } catch (error) {
                console.error("Subscribed Channels Fetch Error:", error);
                res.status(500).send("Server Error");
            }
        });



        // Connect the client to the server
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Keeps connection alive
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});