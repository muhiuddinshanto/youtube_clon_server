
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
dotenv.config();



const app = express();
app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

const port = process.env.PORT || 5000;





// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
    try {


        const db = client.db("youtube_clone");
        const usersCollection = db.collection("users");
        const videosCollection = db.collection("videos");
        const commentsCollection = db.collection("comments");



        app.get('/', (req, res) => {
            res.send("Hello from youtube clon server")
        })

        // app.get('/videos', async (req, res) => {
        //     const videos = await videosCollection.find().toArray();
        //     res.send(videos);
        // })




        app.get('/videos', async (req, res) => {
            try {
                const videosWithChannels = await videosCollection.aggregate([
                    {
                        // 🎯 সরাসরি স্ট্রিং-এর সাথে স্ট্রিং JOIN করা হচ্ছে
                        $lookup: {
                            from: "users",           // ইউজার কালেকশন
                            localField: "userId",    // videos কালেকশনের স্ট্রিং ফিল্ড
                            foreignField: "_id",     // users কালেকশনের স্ট্রিং ফিল্ড
                            as: "channel"            // যে নামে অবজেক্ট তৈরি হবে
                        }
                    },
                    {
                        // lookup-এর অ্যারেকে ভেঙে সিঙ্গেল অবজেক্ট করা
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





        app.get('/videos/:id', async (req, res) => {
            try {
                const id = req.params.id;

                const videoWithChannel = await videosCollection.aggregate([
                    {

                        $match: { _id: id }
                    },
                    {

                        $lookup: {
                            from: "users",
                            localField: "userId",
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



        // 1️⃣ লাইক বাটন চাপলে কী হবে
        app.put('/videos/:id/like', async (req, res) => {
            try {
                const videoId = req.params.id;
                const { userId } = req.body;

                if (!userId) return res.status(400).send({ message: "User ID required" });

                const video = await videosCollection.findOne({ _id: videoId });
                if (!video) return res.status(404).send({ message: "Video not found" });

                const isLiked = video.likes?.includes(userId);

                let updateDoc;
                if (isLiked) {
                    // অলরেডি লাইক থাকলে ➡️ শুধু লাইক তোলো
                    updateDoc = { $pull: { likes: userId } };
                } else {
                    // লাইক না থাকলে ➡️ লাইক দাও এবং একই সাথে ডিসলাইক অ্যারে থেকে আইডি থাকলে তা বের ($pull) করে দাও
                    updateDoc = {
                        $addToSet: { likes: userId },
                        $pull: { dislikes: userId }
                    };
                }

                await videosCollection.updateOne({ _id: videoId }, updateDoc);
                res.send({ success: true });
            } catch (error) {
                res.status(500).send("Server Error");
            }
        });

        // 2️⃣ ডিসলাইক বাটন চাপলে কী হবে
        app.put('/videos/:id/dislike', async (req, res) => {
            try {
                const videoId = req.params.id;
                const { userId } = req.body;

                if (!userId) return res.status(400).send({ message: "User ID required" });

                const video = await videosCollection.findOne({ _id: videoId });
                if (!video) return res.status(404).send({ message: "Video not found" });

                const isDisliked = video.dislikes?.includes(userId);

                let updateDoc;
                if (isDisliked) {
                    // অলরেডি ডিসলাইক থাকলে ➡️ শুধু ডিসলাইক তোলো
                    updateDoc = { $pull: { dislikes: userId } };
                } else {
                    // ডিসলাইক না থাকলে ➡️ ডিসলাইক দাও এবং একই সাথে লাইক অ্যারে থেকে আইডি থাকলে তা বের ($pull) করে দাও
                    updateDoc = {
                        $addToSet: { dislikes: userId },
                        $pull: { likes: userId }
                    };
                }

                await videosCollection.updateOne({ _id: videoId }, updateDoc);
                res.send({ success: true });
            } catch (error) {
                res.status(500).send("Server Error");
            }
        });




        app.get('/users', async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users);
        })


        app.put('/users/:channelId/subscribe', async (req, res) => {
            try {
                const { channelId } = req.params;
                const { isSubscribing } = req.body; // ফ্রন্টএন্ড থেকে true/false পাঠাবো

                //isSubscribing যদি true হয় তবে সংখ্যা ১ বাড়বে, false হলে ১ কমবে
                const changeValue = isSubscribing ? 1 : -1;

                const result = await usersCollection.updateOne(
                    { _id: channelId },
                    { $inc: { subscribers: changeValue } } // মঙ্গোডিবি $inc দিয়ে সরাসরি নাম্বার আপডেট করে
                );

                res.send({ success: true });
            } catch (error) {
                console.error("Subscribe Error:", error);
                res.status(500).send("Server Error");
            }
        });


        app.get('/users/:userId', async (req, res) => {
            const { userId } = req.params;
            const result = await usersCollection.findOne({ _id: userId });
            res.json(result);
        })










        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);













app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});