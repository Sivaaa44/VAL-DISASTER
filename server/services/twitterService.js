const axios = require('axios');
const schedule = require('node-schedule');
const { getFirestore } = require('../config/firebase');

console.log('Twitter service module loaded');

// Twitter API configuration
const url = process.env.RAPIDAPI_URL;
const headers = {
  "x-rapidapi-key": process.env.RAPIDAPI_KEY,
  "x-rapidapi-host": process.env.RAPIDAPI_HOST
};

console.log('Twitter API configuration:');
console.log('URL:', url);
console.log('API Key:', process.env.RAPIDAPI_KEY ? 'Set' : 'Not set');
console.log('API Host:', process.env.RAPIDAPI_HOST);

async function getLastTweetId() {
  console.log('Fetching last tweet ID from Firestore');
  const db = getFirestore();
  try {
    const snapshot = await db.collection('tweets')
      .orderBy('CreationDate', 'desc')
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      const lastTweetId = snapshot.docs[0].data().TweetID;
      console.log('Last Tweet ID found:', lastTweetId);
      return lastTweetId;
    } else {
      console.log('No previous tweets found in Firestore');
      return null;
    }
  } catch (error) {
    console.error("Error retrieving last tweet ID:", error);
    return null;
  }
}

async function fetchTweets() {
  console.log('Starting fetchTweets function');
  const db = getFirestore();
  const lastTweetId = await getLastTweetId();

  let querystring = {
    query: "#jjk250",
    section: "top",
    min_retweets: "0",
    min_likes: "0",
    start_date: "2023-11-13",
    language: "en",
    limit: "5"
  };

  if (lastTweetId) {
    querystring.since_id = lastTweetId;
  }

  // console.log('API request parameters:', querystring);

  try {
    console.log('Sending request to Twitter API');
    const response = await axios.get(url, { headers, params: querystring });
    // console.log('API Response Status:', response.status);
    // console.log('API Response Headers:', response.headers);

    if (response.status === 200) {
      const data = response.data;
      console.log('Fetched tweets count:', data.results?.length || 0);

      if (data.results && data.results.length > 0) {
        console.log('Processing fetched tweets');
        const tweetsData = data.results.map(tweet => ({
          TweetID: tweet.tweet_id,
          CreationDate: tweet.creation_date,
          Username: tweet.user?.username,
          DisplayName: tweet.user?.name,
          Followers: tweet.user?.follower_count,
          Following: tweet.user?.following_count,
          Location: tweet.user?.location,
          ProfileDescription: tweet.user?.description,
          TweetText: tweet.text,
          Retweets: tweet.retweet_count,
          Likes: tweet.favorite_count
        }));

        // console.log('Prepared tweets data:', tweetsData);

        const batch = db.batch();
        tweetsData.forEach(tweet => {
          const docRef = db.collection('tweets').doc();
          batch.set(docRef, tweet);
        });

        console.log('Committing batch write to Firestore');
        await batch.commit();
        console.log('Tweets successfully added to Firestore');
      } else {
        console.log('No new tweets found');
      }
    } else {
      console.error("Unexpected API response status:", response.status);
      console.error("Response data:", response.data);
    }
  } catch (error) {
    console.error("Error in API request:");
    if (error.response) {
      console.error("Response status:", error.response.status);
      // console.error("Response data:", error.response.data);
      // console.error("Response headers:", error.response.headers);
    } else if (error.request) {
      console.error("No response received. Request details:", error.request);
    } else {
      console.error("Error setting up request:", error.message);
    }
    // console.error("Error config:", error.config);
  }
}

function startTwitterScheduler() {
  console.log("Starting Twitter scheduler");
  // Schedule to run every 15 minutes
  const job = schedule.scheduleJob('*/1 * * * *', async () => {
    console.log('Running scheduled Twitter fetch job');
    await fetchTweets();
    console.log('Scheduled Twitter fetch job completed');
  });
  console.log("Twitter scheduler started. Next run at:", job.nextInvocation());
}

module.exports = { startTwitterScheduler };